// Paylance Payroll System - Move Implementation with USDC Support
module paylance_addr::paylance_v12 {
    use std::string::{Self, String};
    use std::vector;
    use std::signer;
    use std::timestamp;
    use std::option::{Self, Option};
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::fungible_asset::{Self, Metadata, FungibleStore, FungibleAsset};
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::dispatchable_fungible_asset;
    // Chainlink Data Feeds on Aptos
    use data_feeds::router::get_benchmarks;
    use data_feeds::registry::{Benchmark, get_benchmark_value};

    // Chainlink Feed IDs (Aptos Testnet)
    // APT / USD
    const APT_USD_PRICE_FEED_ID: vector<u8> = x"011e22d6bf000332000000000000000000000000000000000000000000000000";
    // USDC / USD
    const USDC_USD_PRICE_FEED_ID: vector<u8> = x"01a80ff216000332000000000000000000000000000000000000000000000000";

    // Error codes
    const ENOT_ADMIN: u64 = 1;
    const EEMPLOYEE_NOT_FOUND: u64 = 2;
    const EEMPLOYEE_EXISTS: u64 = 3;
    const EPAYROLL_PAUSED: u64 = 4;
    const EEMPLOYEE_PAUSED: u64 = 5;
    const EINSUFFICIENT_BALANCE: u64 = 6;
    const ECOMPANY_NOT_INITIALIZED: u64 = 7;
    const ECOMPANY_ALREADY_EXISTS: u64 = 8;
    const EINVALID_AMOUNT: u64 = 9;
    const EINVALID_PRICE_FEED: u64 = 10;
    const EINSUFFICIENT_USDC_BALANCE: u64 = 11;
    const EINVALID_TOKEN_TYPE: u64 = 12;

    // USDC Metadata Address (Fungible Asset)
    const USDC_METADATA_ADDRESS: address = @0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832;

    // Employee structure - salary now in USDC (6 decimals)
    struct Employee has store, copy, drop {
        name: String,
        email: String,
        wallet: address,
        role: String,
        salary_usdc: u64, // Salary in USDC (6 decimals)
        paused: bool,
        last_paid: u64,
        total_paid_usdc: u64, // Total paid in USDC
        total_paid_apt: u64, // Total paid in APT (for tracking)
    }

    // Payment log structure
    struct PaymentLog has store, copy, drop {
        timestamp: u64,
        amount: u64,
        employee_name: String,
        employee_role: String,
        employee_email: String,
        employee_wallet: address,
        token_type: String, // "APT" or "USDC"
        usdc_amount: u64, // Amount in USDC (for tracking)
        apt_amount: u64, // Amount in APT (for tracking)
    }

    // Main company resource
    struct Company has key {
        admin: address,
        company_name: String,
        company_email: String,
        payroll_paused: bool,
        employees: vector<Employee>,
        all_payments: vector<PaymentLog>,
        // USDC secondary store owned by a company-owned object (treasury)
        usdc_store: Object<FungibleStore>,
        // ExtendRef to generate signer for the store owner object when needed
        usdc_store_extend_ref: ExtendRef,
        // Event handles
        employee_added_events: EventHandle<EmployeeAddedEvent>,
        employee_removed_events: EventHandle<EmployeeRemovedEvent>,
        salary_paid_events: EventHandle<SalaryPaidEvent>,
        payroll_paused_events: EventHandle<PayrollPausedEvent>,
        payroll_resumed_events: EventHandle<PayrollResumedEvent>,
    }

    // Treasury resource to hold funds
    struct Treasury<phantom CoinType> has key {
        coins: Coin<CoinType>,
    }

    // USDC Treasury resource removed in favor of a real FA secondary store on the Company


    // Global registry to track all companies
    struct CompanyRegistry has key {
        companies: vector<CompanyInfo>,
        admin_to_company: vector<AdminCompanyMapping>,
    }

    struct CompanyInfo has store, copy, drop {
        company_address: address,
        company_name: String,
        admin: address,
        email: String,
    }

    struct AdminCompanyMapping has store, copy, drop {
        admin: address,
        company_address: address,
    }

    // Event structures
    struct EmployeeAddedEvent has store, drop {
        wallet: address,
        name: String,
        role: String,
        salary_usdc: u64,
    }

    struct EmployeeRemovedEvent has store, drop {
        wallet: address,
        name: String,
    }

    struct SalaryPaidEvent has store, drop {
        employee_wallet: address,
        amount: u64,
        token_type: String,
        usdc_amount: u64,
        apt_amount: u64,
    }

    struct PayrollPausedEvent has store, drop {
        timestamp: u64,
    }

    struct PayrollResumedEvent has store, drop {
        timestamp: u64,
    }

    // Initialize the global registry (called once)
    public entry fun initialize_registry(account: &signer) {
        let account_addr = signer::address_of(account);
        assert!(!exists<CompanyRegistry>(account_addr), ECOMPANY_ALREADY_EXISTS);
        
        move_to(account, CompanyRegistry {
            companies: vector::empty(),
            admin_to_company: vector::empty(),
        });
    }

    // Initialize a new company (replaces factory pattern)
    // ONE ADMIN CAN ONLY CREATE ONE COMPANY
    public entry fun create_company(
        admin: &signer,
        company_name: String,
        company_email: String,
        registry_address: address,
    ) acquires CompanyRegistry {
        let admin_addr = signer::address_of(admin);
        
        // Check if company already exists under this admin
        assert!(!exists<Company>(admin_addr), ECOMPANY_ALREADY_EXISTS);
        
        // Check in global registry if admin already has a company
        if (exists<CompanyRegistry>(registry_address)) {
            let registry = borrow_global<CompanyRegistry>(registry_address);
            let mapping_len = vector::length(&registry.admin_to_company);
            let i = 0;
            while (i < mapping_len) {
                let mapping = vector::borrow(&registry.admin_to_company, i);
                assert!(mapping.admin != admin_addr, ECOMPANY_ALREADY_EXISTS);
                i = i + 1;
            };
        };

        // Create a secondary USDC store owned by a company-owned object (treasury)
        let usdc_metadata = object::address_to_object<Metadata>(USDC_METADATA_ADDRESS);
        let store_constructor = object::create_sticky_object(signer::address_of(admin));
        let usdc_store_extend_ref = object::generate_extend_ref(&store_constructor);
        let usdc_store = fungible_asset::create_store(&store_constructor, usdc_metadata);

        // Create company resource
        let company = Company {
            admin: admin_addr,
            company_name: company_name,
            company_email: company_email,
            payroll_paused: false,
            employees: vector::empty(),
            all_payments: vector::empty(),
            usdc_store,
            usdc_store_extend_ref,
            employee_added_events: account::new_event_handle<EmployeeAddedEvent>(admin),
            employee_removed_events: account::new_event_handle<EmployeeRemovedEvent>(admin),
            salary_paid_events: account::new_event_handle<SalaryPaidEvent>(admin),
            payroll_paused_events: account::new_event_handle<PayrollPausedEvent>(admin),
            payroll_resumed_events: account::new_event_handle<PayrollResumedEvent>(admin),
        };

        // Create treasury for APT
        let treasury = Treasury<AptosCoin> {
            coins: coin::zero<AptosCoin>(),
        };

        move_to(admin, company);
        move_to(admin, treasury);

        // Update global registry
        if (exists<CompanyRegistry>(registry_address)) {
            let registry = borrow_global_mut<CompanyRegistry>(registry_address);
            let company_info = CompanyInfo {
                company_address: admin_addr,
                company_name,
                admin: admin_addr,
                email: company_email,
            };
            let admin_mapping = AdminCompanyMapping {
                admin: admin_addr,
                company_address: admin_addr,
            };
            vector::push_back(&mut registry.companies, company_info);
            vector::push_back(&mut registry.admin_to_company, admin_mapping);
        };
    }

    // Employee management functions
    public entry fun add_employee(
        admin: &signer,
        name: String,
        email: String,
        wallet: address,
        role: String,
        salary_usdc: u64, // Salary in USDC (6 decimals)
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        
        // Check if employee already exists
        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            assert!(emp.wallet != wallet, EEMPLOYEE_EXISTS);
            i = i + 1;
        };

        let employee = Employee {
            name,
            email,
            wallet,
            role,
            salary_usdc,
            paused: false,
            last_paid: 0,
            total_paid_usdc: 0,
            total_paid_apt: 0,
        };

        vector::push_back(&mut company.employees, employee);

        // Emit event
        event::emit_event(&mut company.employee_added_events, EmployeeAddedEvent {
            wallet,
            name,
            role,
            salary_usdc,
        });
    }

    public entry fun remove_employee(
        admin: &signer,
        employee_wallet: address,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);

        let len = vector::length(&company.employees);
        let i = 0;
        let found = false;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            if (emp.wallet == employee_wallet) {
                let removed_emp = vector::remove(&mut company.employees, i);
                
                // Emit event
                event::emit_event(&mut company.employee_removed_events, EmployeeRemovedEvent {
                    wallet: removed_emp.wallet,
                    name: removed_emp.name,
                });
                
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, EEMPLOYEE_NOT_FOUND);
    }

    public entry fun update_employee_salary(
        admin: &signer,
        employee_wallet: address,
        new_salary: u64,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        
        let len = vector::length(&company.employees);
        let i = 0;
        let found = false;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (emp.wallet == employee_wallet) {
                emp.salary_usdc = new_salary;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, EEMPLOYEE_NOT_FOUND);
    }

    /// Update employee name
    public entry fun update_employee_name(
        admin: &signer,
        employee_wallet: address,
        new_name: String,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        
        let len = vector::length(&company.employees);
        let i = 0;
        let found = false;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (emp.wallet == employee_wallet) {
                emp.name = new_name;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, EEMPLOYEE_NOT_FOUND);
    }

    /// Update employee email
    public entry fun update_employee_email(
        admin: &signer,
        employee_wallet: address,
        new_email: String,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        
        let len = vector::length(&company.employees);
        let i = 0;
        let found = false;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (emp.wallet == employee_wallet) {
                emp.email = new_email;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, EEMPLOYEE_NOT_FOUND);
    }

    /// Update employee role
    public entry fun update_employee_role(
        admin: &signer,
        employee_wallet: address,
        new_role: String,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        
        let len = vector::length(&company.employees);
        let i = 0;
        let found = false;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (emp.wallet == employee_wallet) {
                emp.role = new_role;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, EEMPLOYEE_NOT_FOUND);
    }

    /// Update employee wallet address
    public entry fun update_employee_wallet(
        admin: &signer,
        old_wallet: address,
        new_wallet: address,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        
        // Check if new wallet already exists
        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            assert!(emp.wallet != new_wallet, EEMPLOYEE_EXISTS);
            i = i + 1;
        };
        
        // Update the wallet
        i = 0;
        let found = false;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (emp.wallet == old_wallet) {
                emp.wallet = new_wallet;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, EEMPLOYEE_NOT_FOUND);
    }

    /// Update all employee fields at once (without status)
    public entry fun update_employee_all(
        admin: &signer,
        employee_wallet: address,
        new_name: String,
        new_email: String,
        new_role: String,
        new_salary: u64,
        new_wallet: address,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        
        // Check if new wallet already exists (if different from current)
        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            if (emp.wallet != employee_wallet) {
                assert!(emp.wallet != new_wallet, EEMPLOYEE_EXISTS);
            };
            i = i + 1;
        };
        
        // Find and update the employee
        i = 0;
        let found = false;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (emp.wallet == employee_wallet) {
                emp.name = new_name;
                emp.email = new_email;
                emp.role = new_role;
                emp.salary_usdc = new_salary;
                emp.wallet = new_wallet;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, EEMPLOYEE_NOT_FOUND);
    }

    /// Update all employee fields at once including status
    public entry fun update_employee_complete(
        admin: &signer,
        employee_wallet: address,
        new_name: String,
        new_email: String,
        new_role: String,
        new_salary: u64,
        new_wallet: address,
        new_paused: bool,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        
        // Check if new wallet already exists (if different from current)
        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            if (emp.wallet != employee_wallet) {
                assert!(emp.wallet != new_wallet, EEMPLOYEE_EXISTS);
            };
            i = i + 1;
        };
        
        // Find and update the employee
        i = 0;
        let found = false;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (emp.wallet == employee_wallet) {
                emp.name = new_name;
                emp.email = new_email;
                emp.role = new_role;
                emp.salary_usdc = new_salary;
                emp.wallet = new_wallet;
                emp.paused = new_paused;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, EEMPLOYEE_NOT_FOUND);
    }

    public entry fun pause_employee(
        admin: &signer,
        employee_wallet: address,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);

        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (emp.wallet == employee_wallet) {
                emp.paused = true;
                break
            };
            i = i + 1;
        };
    }

    public entry fun resume_employee(
        admin: &signer,
        employee_wallet: address,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);

        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (emp.wallet == employee_wallet) {
                emp.paused = false;
                break
            };
            i = i + 1;
        };
    }

    public entry fun pause_payroll(admin: &signer) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        
        company.payroll_paused = true;
        
        event::emit_event(&mut company.payroll_paused_events, PayrollPausedEvent {
            timestamp: timestamp::now_microseconds(),
        });
    }

    public entry fun resume_payroll(admin: &signer) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        
        company.payroll_paused = false;
        
        event::emit_event(&mut company.payroll_resumed_events, PayrollResumedEvent {
            timestamp: timestamp::now_microseconds(),
        });
    }

    // Deposit functions
    public entry fun deposit_apt(
        admin: &signer,
        amount: u64,
    ) acquires Treasury {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Treasury<AptosCoin>>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        assert!(amount > 0, EINVALID_AMOUNT);

        let coins = coin::withdraw<AptosCoin>(admin, amount);
        let treasury = borrow_global_mut<Treasury<AptosCoin>>(admin_addr);
        coin::merge(&mut treasury.coins, coins);
    }

    // Deposit USDC into company treasury store (secondary store owned by company)
    public entry fun deposit_usdc(
        admin: &signer,
        amount: u64,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        assert!(amount > 0, EINVALID_AMOUNT);

        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);

        // Get USDC metadata object
        let usdc_metadata = object::address_to_object<Metadata>(USDC_METADATA_ADDRESS);

        // Check admin has sufficient USDC balance in their primary store
        let admin_balance = primary_fungible_store::balance(admin_addr, usdc_metadata);
        assert!(admin_balance >= amount, EINSUFFICIENT_USDC_BALANCE);

        // Withdraw from admin primary store and deposit into company USDC store
        let fa: FungibleAsset = primary_fungible_store::withdraw(admin, usdc_metadata, amount);
        dispatchable_fungible_asset::deposit(company.usdc_store, fa);
    }

    // Price conversion helper functions using Chainlink Data Feeds
    
    // Helper: integer power
    fun pow(base: u64, exp: u64): u64 {
        if (exp == 0) {
            1
        } else {
            let result = base;
            let i = 1;
            while (i < exp) {
                result = result * base;
                i = i + 1;
            };
            result
        }
    }

    // Fetch a single benchmark price (18 decimal places) for a given feed id
    fun get_feed_price_18(account: &signer, feed_id: vector<u8>): u256 {
        let feed_ids = vector[feed_id];
        let billing_data: vector<u8> = vector[];
        let mut_benchmarks: vector<Benchmark> = get_benchmarks(account, feed_ids, billing_data);
        let benchmark = vector::pop_back(&mut mut_benchmarks);
        get_benchmark_value(&benchmark)
    }

    // Convert 18-decimal u256 price to 8-decimal u64 price (by dividing 1e10)
    fun to_u64_8_decimals(price_18: u256): u64 {
        let scale_down: u256 = (10000000000 as u256); // 1e10
        (price_18 / scale_down) as u64
    }

    // APT price from Chainlink (returns 8-decimal USD)
    fun get_apt_price_8(account: &signer): u64 {
        let p18 = get_feed_price_18(account, APT_USD_PRICE_FEED_ID);
        to_u64_8_decimals(p18)
    }

    // USDC price from Chainlink (returns 8-decimal USD)
    fun get_usdc_price_8(account: &signer): u64 {
        let p18 = get_feed_price_18(account, USDC_USD_PRICE_FEED_ID);
        to_u64_8_decimals(p18)
    }

    // Convert USDC amount (6 decimals) to APT amount (8 decimals) using simplified pricing
    public fun convert_usdc_to_apt(account: &signer, usdc_amount: u64): u64 {
        let apt_price = get_apt_price_8(account); // 8-decimal USD price
        let usdc_price = get_usdc_price_8(account); // 8-decimal USD price

        // Normalize USDC from 6->8 decimals by multiplying by 100
        // Formula: (usdc_amount_6 * 100 * usdc_price_8) / apt_price_8 => apt_amount_8
        let numerator = usdc_amount * 100 * usdc_price;
        let denominator = apt_price;

        numerator / denominator
    }

    // Convert APT amount (8 decimals) to USDC amount (6 decimals) using simplified pricing
    public fun convert_apt_to_usdc(account: &signer, apt_amount: u64): u64 {
        let apt_price = get_apt_price_8(account); // 8-decimal USD price
        let usdc_price = get_usdc_price_8(account); // 8-decimal USD price

        // First get 8-decimal USDC-equivalent amount: (apt_amount_8 * apt_price_8) / usdc_price_8
        let usdc_8 = (apt_amount * apt_price) / usdc_price;
        // Convert 8->6 decimals by dividing by 100
        usdc_8 / 100
    }

    // Fixed single employee USDC payment function
    public entry fun pay_single_employee_usdc(
        admin: &signer,
        employee_wallet: address,
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        assert!(!company.payroll_paused, EPAYROLL_PAUSED);

        // Find employee
        let len = vector::length(&company.employees);
        let i = 0;
        let found = false;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (emp.wallet == employee_wallet) {
                assert!(!emp.paused, EEMPLOYEE_PAUSED);
                
                // Ensure company USDC store has sufficient balance
                let store_balance = fungible_asset::balance(company.usdc_store);
                assert!(store_balance >= emp.salary_usdc, EINSUFFICIENT_USDC_BALANCE);

                // Withdraw from company store (using store owner signer) and deposit to employee primary store
                let store_signer = object::generate_signer_for_extending(&company.usdc_store_extend_ref);
                let fa_to_pay: FungibleAsset = dispatchable_fungible_asset::withdraw(&store_signer, company.usdc_store, emp.salary_usdc);
                primary_fungible_store::deposit(employee_wallet, fa_to_pay);
                
                // Update employee record
                emp.last_paid = timestamp::now_microseconds();
                emp.total_paid_usdc = emp.total_paid_usdc + emp.salary_usdc;
                
                // Log payment
                let payment_log = PaymentLog {
                    timestamp: timestamp::now_microseconds(),
                    amount: emp.salary_usdc,
                    employee_name: emp.name,
                    employee_role: emp.role,
                    employee_email: emp.email,
                    employee_wallet: emp.wallet,
                    token_type: string::utf8(b"USDC"),
                    usdc_amount: emp.salary_usdc,
                    apt_amount: 0,
                };
                vector::push_back(&mut company.all_payments, payment_log);
                
                // Emit event
                event::emit_event(&mut company.salary_paid_events, SalaryPaidEvent {
                    employee_wallet: emp.wallet,
                    amount: emp.salary_usdc,
                    token_type: string::utf8(b"USDC"),
                    usdc_amount: emp.salary_usdc,
                    apt_amount: 0,
                });
                
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, EEMPLOYEE_NOT_FOUND);
    }

    // Payment functions - Pay employee in APT (converted from USDC salary)
    public entry fun pay_single_employee_apt(
        admin: &signer,
        employee_wallet: address,
    ) acquires Company, Treasury {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        assert!(!company.payroll_paused, EPAYROLL_PAUSED);

        // Find employee
        let len = vector::length(&company.employees);
        let i = 0;
        let found = false;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (emp.wallet == employee_wallet) {
                assert!(!emp.paused, EEMPLOYEE_PAUSED);
                
                // Convert USDC salary to APT amount using Chainlink price feeds
                let apt_amount = convert_usdc_to_apt(admin, emp.salary_usdc);
                
                // Check APT treasury balance
                let treasury = borrow_global_mut<Treasury<AptosCoin>>(admin_addr);
                assert!(coin::value(&treasury.coins) >= apt_amount, EINSUFFICIENT_BALANCE);
                
                // Transfer APT payment
                let payment = coin::extract(&mut treasury.coins, apt_amount);
                coin::deposit(emp.wallet, payment);
                
                // Update employee record
                emp.last_paid = timestamp::now_microseconds();
                emp.total_paid_usdc = emp.total_paid_usdc + emp.salary_usdc;
                emp.total_paid_apt = emp.total_paid_apt + apt_amount;
                
                // Log payment
                let payment_log = PaymentLog {
                    timestamp: timestamp::now_microseconds(),
                    amount: apt_amount,
                    employee_name: emp.name,
                    employee_role: emp.role,
                    employee_email: emp.email,
                    employee_wallet: emp.wallet,
                    token_type: string::utf8(b"APT"),
                    usdc_amount: emp.salary_usdc,
                    apt_amount: apt_amount,
                };
                vector::push_back(&mut company.all_payments, payment_log);
                
                // Emit event
                event::emit_event(&mut company.salary_paid_events, SalaryPaidEvent {
                    employee_wallet: emp.wallet,
                    amount: apt_amount,
                    token_type: string::utf8(b"APT"),
                    usdc_amount: emp.salary_usdc,
                    apt_amount: apt_amount,
                });
                
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, EEMPLOYEE_NOT_FOUND);
    }

    // Fixed bulk USDC payment function
    public entry fun pay_all_employees_usdc(admin: &signer) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        assert!(!company.payroll_paused, EPAYROLL_PAUSED);

        // Calculate total USDC payroll
        let total_usdc_payroll = 0;
        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            if (!emp.paused) {
                total_usdc_payroll = total_usdc_payroll + emp.salary_usdc;
            };
            i = i + 1;
        };

        // Check company USDC store balance
        let store_balance = fungible_asset::balance(company.usdc_store);
        assert!(store_balance >= total_usdc_payroll, EINSUFFICIENT_USDC_BALANCE);

        // Pay all active employees
        i = 0;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (!emp.paused) {
                // Withdraw from company store (using store owner signer) and deposit to employee primary store
                let store_signer = object::generate_signer_for_extending(&company.usdc_store_extend_ref);
                let fa_to_pay: FungibleAsset = dispatchable_fungible_asset::withdraw(&store_signer, company.usdc_store, emp.salary_usdc);
                primary_fungible_store::deposit(emp.wallet, fa_to_pay);
                
                emp.last_paid = timestamp::now_microseconds();
                emp.total_paid_usdc = emp.total_paid_usdc + emp.salary_usdc;
                
                let payment_log = PaymentLog {
                    timestamp: timestamp::now_microseconds(),
                    amount: emp.salary_usdc,
                    employee_name: emp.name,
                    employee_role: emp.role,
                    employee_email: emp.email,
                    employee_wallet: emp.wallet,
                    token_type: string::utf8(b"USDC"),
                    usdc_amount: emp.salary_usdc,
                    apt_amount: 0,
                };
                vector::push_back(&mut company.all_payments, payment_log);
                
                event::emit_event(&mut company.salary_paid_events, SalaryPaidEvent {
                    employee_wallet: emp.wallet,
                    amount: emp.salary_usdc,
                    token_type: string::utf8(b"USDC"),
                    usdc_amount: emp.salary_usdc,
                    apt_amount: 0,
                });
            };
            i = i + 1;
        };
    }

    // Bulk payment functions - Pay all employees in APT (converted from USDC)
    public entry fun pay_all_employees_apt(admin: &signer) acquires Company, Treasury {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        assert!(!company.payroll_paused, EPAYROLL_PAUSED);

        // Calculate total APT payroll (converted from USDC salaries)
        let total_apt_payroll = 0;
        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            if (!emp.paused) {
                let apt_amount = convert_usdc_to_apt(admin, emp.salary_usdc);
                total_apt_payroll = total_apt_payroll + apt_amount;
            };
            i = i + 1;
        };

        // Check APT treasury balance
        let treasury = borrow_global_mut<Treasury<AptosCoin>>(admin_addr);
        assert!(coin::value(&treasury.coins) >= total_apt_payroll, EINSUFFICIENT_BALANCE);

        // Pay all active employees
        i = 0;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (!emp.paused) {
                let apt_amount = convert_usdc_to_apt(admin, emp.salary_usdc);
                let payment = coin::extract(&mut treasury.coins, apt_amount);
                coin::deposit(emp.wallet, payment);
                
                emp.last_paid = timestamp::now_microseconds();
                emp.total_paid_usdc = emp.total_paid_usdc + emp.salary_usdc;
                emp.total_paid_apt = emp.total_paid_apt + apt_amount;
                
                let payment_log = PaymentLog {
                    timestamp: timestamp::now_microseconds(),
                    amount: apt_amount,
                    employee_name: emp.name,
                    employee_role: emp.role,
                    employee_email: emp.email,
                    employee_wallet: emp.wallet,
                    token_type: string::utf8(b"APT"),
                    usdc_amount: emp.salary_usdc,
                    apt_amount: apt_amount,
                };
                vector::push_back(&mut company.all_payments, payment_log);
                
                event::emit_event(&mut company.salary_paid_events, SalaryPaidEvent {
                    employee_wallet: emp.wallet,
                    amount: apt_amount,
                    token_type: string::utf8(b"APT"),
                    usdc_amount: emp.salary_usdc,
                    apt_amount: apt_amount,
                });
            };
            i = i + 1;
        };
    }

    // Pay selected employees (bulk payment for specific employees)
    public entry fun pay_selected_employees(
        admin: &signer,
        employee_wallets: vector<address>
    ) acquires Company, Treasury {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        assert!(!company.payroll_paused, EPAYROLL_PAUSED);

        let treasury = borrow_global_mut<Treasury<AptosCoin>>(admin_addr);
        let selected_count = vector::length(&employee_wallets);
        let i = 0;

        // Process each selected employee
        while (i < selected_count) {
            let employee_wallet = *vector::borrow(&employee_wallets, i);
            
            // Find employee in company
            let emp_len = vector::length(&company.employees);
            let j = 0;
            let found = false;
            while (j < emp_len) {
                let emp = vector::borrow_mut(&mut company.employees, j);
                if (emp.wallet == employee_wallet) {
                    assert!(!emp.paused, EEMPLOYEE_PAUSED);
                    
                    // Convert USDC salary to APT amount
                    let apt_amount = convert_usdc_to_apt(admin, emp.salary_usdc);
                    
                    // Check treasury balance for this employee
                    assert!(coin::value(&treasury.coins) >= apt_amount, EINSUFFICIENT_BALANCE);
                    
                    // Transfer payment
                    let payment = coin::extract(&mut treasury.coins, apt_amount);
                    coin::deposit(employee_wallet, payment);
                    
                    // Update employee record
                    emp.last_paid = timestamp::now_microseconds();
                    emp.total_paid_usdc = emp.total_paid_usdc + emp.salary_usdc;
                    emp.total_paid_apt = emp.total_paid_apt + apt_amount;
                    
                    // Log payment
                    let payment_log = PaymentLog {
                        timestamp: timestamp::now_microseconds(),
                        amount: apt_amount,
                        employee_name: emp.name,
                        employee_role: emp.role,
                        employee_email: emp.email,
                        employee_wallet: emp.wallet,
                        token_type: string::utf8(b"APT"),
                        usdc_amount: emp.salary_usdc,
                        apt_amount: apt_amount,
                    };
                    vector::push_back(&mut company.all_payments, payment_log);
                    
                    // Emit event
                    event::emit_event(&mut company.salary_paid_events, SalaryPaidEvent {
                        employee_wallet: emp.wallet,
                        amount: apt_amount,
                        token_type: string::utf8(b"APT"),
                        usdc_amount: emp.salary_usdc,
                        apt_amount: apt_amount,
                    });
                    
                    found = true;
                    break
                };
                j = j + 1;
            };
            assert!(found, EEMPLOYEE_NOT_FOUND);
            i = i + 1;
        };
    }

    // Fixed selected employees USDC payment function
    public entry fun pay_selected_employees_usdc(
        admin: &signer,
        employee_wallets: vector<address>
    ) acquires Company {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        assert!(!company.payroll_paused, EPAYROLL_PAUSED);

        let selected_count = vector::length(&employee_wallets);
        let i = 0;

        // Process each selected employee
        while (i < selected_count) {
            let employee_wallet = *vector::borrow(&employee_wallets, i);
            
            // Find employee in company
            let emp_len = vector::length(&company.employees);
            let j = 0;
            let found = false;
            while (j < emp_len) {
                let emp = vector::borrow_mut(&mut company.employees, j);
                if (emp.wallet == employee_wallet) {
                    assert!(!emp.paused, EEMPLOYEE_PAUSED);
                    
                    // Check company USDC store balance for this employee and pay from store
                    let store_balance = fungible_asset::balance(company.usdc_store);
                    assert!(store_balance >= emp.salary_usdc, EINSUFFICIENT_USDC_BALANCE);

                    let store_signer = object::generate_signer_for_extending(&company.usdc_store_extend_ref);
                    let fa_to_pay: FungibleAsset = dispatchable_fungible_asset::withdraw(&store_signer, company.usdc_store, emp.salary_usdc);
                    primary_fungible_store::deposit(employee_wallet, fa_to_pay);
                    
                    // Update employee record
                    emp.last_paid = timestamp::now_microseconds();
                    emp.total_paid_usdc = emp.total_paid_usdc + emp.salary_usdc;
                    
                    // Log payment
                    let payment_log = PaymentLog {
                        timestamp: timestamp::now_microseconds(),
                        amount: emp.salary_usdc,
                        employee_name: emp.name,
                        employee_role: emp.role,
                        employee_email: emp.email,
                        employee_wallet: emp.wallet,
                        token_type: string::utf8(b"USDC"),
                        usdc_amount: emp.salary_usdc,
                        apt_amount: 0,
                    };
                    vector::push_back(&mut company.all_payments, payment_log);
                    
                    // Emit event
                    event::emit_event(&mut company.salary_paid_events, SalaryPaidEvent {
                        employee_wallet: emp.wallet,
                        amount: emp.salary_usdc,
                        token_type: string::utf8(b"USDC"),
                        usdc_amount: emp.salary_usdc,
                        apt_amount: 0,
                    });
                    
                    found = true;
                    break
                };
                j = j + 1;
            };
            assert!(found, EEMPLOYEE_NOT_FOUND);
            i = i + 1;
        };
    }

    // View functions
    #[view]
    public fun get_company_info(company_address: address): (String, String, bool) acquires Company {
        assert!(exists<Company>(company_address), ECOMPANY_NOT_INITIALIZED);
        let company = borrow_global<Company>(company_address);
        (company.company_name, company.company_email, company.payroll_paused)
    }

    #[view]
    public fun get_all_employees(company_address: address): vector<Employee> acquires Company {
        assert!(exists<Company>(company_address), ECOMPANY_NOT_INITIALIZED);
        let company = borrow_global<Company>(company_address);
        company.employees
    }

    #[view]
    public fun get_employee(company_address: address, employee_wallet: address): Employee acquires Company {
        assert!(exists<Company>(company_address), ECOMPANY_NOT_INITIALIZED);
        let company = borrow_global<Company>(company_address);
        
        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            if (emp.wallet == employee_wallet) {
                return *emp
            };
            i = i + 1;
        };
        abort EEMPLOYEE_NOT_FOUND
    }

    #[view]
    public fun get_treasury_balance(company_address: address): u64 acquires Treasury {
        assert!(exists<Treasury<AptosCoin>>(company_address), ECOMPANY_NOT_INITIALIZED);
        let treasury = borrow_global<Treasury<AptosCoin>>(company_address);
        coin::value(&treasury.coins)
    }

    // USDC treasury balance view function from the company's secondary store
    #[view]
    public fun get_usdc_treasury_balance(company_address: address): u64 acquires Company {
        assert!(exists<Company>(company_address), ECOMPANY_NOT_INITIALIZED);
        let company = borrow_global<Company>(company_address);
        // For dispatchable assets, the balance API is the same
        fungible_asset::balance(company.usdc_store)
    }

    // Public view function to get a reasonable APT price estimate (8 decimal places)
    // This returns a static value for frontend display purposes
    // The actual Oracle conversion happens during payment execution
    #[view]
    public fun get_apt_price_estimate_usd(): u64 {
        // Return $10.00 in 8 decimal places (1000000000)
        // This is just for frontend display - actual Oracle price is used during payments
        1000000000
    }

    #[view]
    public fun get_total_active_payroll_usdc(company_address: address): u64 acquires Company {
        assert!(exists<Company>(company_address), ECOMPANY_NOT_INITIALIZED);
        let company = borrow_global<Company>(company_address);
        
        let total = 0;
        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            if (!emp.paused) {
                total = total + emp.salary_usdc;
            };
            i = i + 1;
        };
        total
    }

    public fun get_total_active_payroll_apt(account: &signer, company_address: address): u64 acquires Company {
        assert!(exists<Company>(company_address), ECOMPANY_NOT_INITIALIZED);
        let company = borrow_global<Company>(company_address);
        
        let total = 0;
        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            if (!emp.paused) {
                let apt_amount = convert_usdc_to_apt(account, emp.salary_usdc);
                total = total + apt_amount;
            };
            i = i + 1;
        };
        total
    }

    #[view]
    public fun get_all_payment_logs(company_address: address): vector<PaymentLog> acquires Company {
        assert!(exists<Company>(company_address), ECOMPANY_NOT_INITIALIZED);
        let company = borrow_global<Company>(company_address);
        company.all_payments
    }

    #[view]
    public fun get_all_companies(registry_address: address): vector<CompanyInfo> acquires CompanyRegistry {
        assert!(exists<CompanyRegistry>(registry_address), ECOMPANY_NOT_INITIALIZED);
        let registry = borrow_global<CompanyRegistry>(registry_address);
        registry.companies
    }

    #[view]
    public fun has_company(admin_address: address): bool {
        exists<Company>(admin_address)
    }

    #[view]
    public fun get_company_by_admin(registry_address: address, admin_address: address): Option<CompanyInfo> acquires CompanyRegistry {
        if (!exists<CompanyRegistry>(registry_address)) {
            return option::none<CompanyInfo>()
        };
        
        let registry = borrow_global<CompanyRegistry>(registry_address);
        let mapping_len = vector::length(&registry.admin_to_company);
        let i = 0;
        while (i < mapping_len) {
            let mapping = vector::borrow(&registry.admin_to_company, i);
            if (mapping.admin == admin_address) {
                // Find the company info
                let company_len = vector::length(&registry.companies);
                let j = 0;
                while (j < company_len) {
                    let company_info = vector::borrow(&registry.companies, j);
                    if (company_info.company_address == mapping.company_address) {
                        return option::some(*company_info)
                    };
                    j = j + 1;
                };
            };
            i = i + 1;
        };
        option::none<CompanyInfo>()
    }
}