// Paylance Payroll System - Move Implementation
module paylance_addr::paylance {
    use std::string::{Self, String};
    use std::vector;
    use std::signer;
    use std::timestamp;
    use std::option::{Self, Option};
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

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

    // Employee structure
    struct Employee has store, copy, drop {
        name: String,
        email: String,
        wallet: address,
        role: String,
        salary: u64,
        paused: bool,
        last_paid: u64,
        total_paid: u64,
    }

    // Payment log structure
    struct PaymentLog has store, copy, drop {
        timestamp: u64,
        amount: u64,
        employee_name: String,
        employee_role: String,
        employee_email: String,
        employee_wallet: address,
        token_type: String, // "APT" or custom token identifier
    }

    // Main company resource
    struct Company has key {
        admin: address,
        company_name: String,
        company_email: String,
        payroll_paused: bool,
        employees: vector<Employee>,
        all_payments: vector<PaymentLog>,
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
        salary: u64,
    }

    struct EmployeeRemovedEvent has store, drop {
        wallet: address,
        name: String,
    }

    struct SalaryPaidEvent has store, drop {
        employee_wallet: address,
        amount: u64,
        token_type: String,
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

        // Create company resource
        let company = Company {
            admin: admin_addr,
            company_name: company_name,
            company_email: company_email,
            payroll_paused: false,
            employees: vector::empty(),
            all_payments: vector::empty(),
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
        salary: u64,
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
            salary,
            paused: false,
            last_paid: 0,
            total_paid: 0,
        };

        vector::push_back(&mut company.employees, employee);

        // Emit event
        event::emit_event(&mut company.employee_added_events, EmployeeAddedEvent {
            wallet,
            name,
            role,
            salary,
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
                emp.salary = new_salary;
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
                emp.salary = new_salary;
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
                emp.salary = new_salary;
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

    // Payment functions
    public entry fun pay_single_employee(
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
                
                // Check treasury balance
                let treasury = borrow_global_mut<Treasury<AptosCoin>>(admin_addr);
                assert!(coin::value(&treasury.coins) >= emp.salary, EINSUFFICIENT_BALANCE);
                
                // Transfer payment
                let payment = coin::extract(&mut treasury.coins, emp.salary);
                coin::deposit(emp.wallet, payment);
                
                // Update employee record
                emp.last_paid = timestamp::now_microseconds();
                emp.total_paid = emp.total_paid + emp.salary;
                
                // Log payment
                let payment_log = PaymentLog {
                    timestamp: timestamp::now_microseconds(),
                    amount: emp.salary,
                    employee_name: emp.name,
                    employee_role: emp.role,
                    employee_email: emp.email,
                    employee_wallet: emp.wallet,
                    token_type: string::utf8(b"APT"),
                };
                vector::push_back(&mut company.all_payments, payment_log);
                
                // Emit event
                event::emit_event(&mut company.salary_paid_events, SalaryPaidEvent {
                    employee_wallet: emp.wallet,
                    amount: emp.salary,
                    token_type: string::utf8(b"APT"),
                });
                
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, EEMPLOYEE_NOT_FOUND);
    }

    public entry fun pay_all_employees(admin: &signer) acquires Company, Treasury {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Company>(admin_addr), ECOMPANY_NOT_INITIALIZED);
        
        let company = borrow_global_mut<Company>(admin_addr);
        assert!(company.admin == admin_addr, ENOT_ADMIN);
        assert!(!company.payroll_paused, EPAYROLL_PAUSED);

        // Calculate total payroll
        let total_payroll = 0;
        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            if (!emp.paused) {
                total_payroll = total_payroll + emp.salary;
            };
            i = i + 1;
        };

        // Check treasury balance
        let treasury = borrow_global_mut<Treasury<AptosCoin>>(admin_addr);
        assert!(coin::value(&treasury.coins) >= total_payroll, EINSUFFICIENT_BALANCE);

        // Pay all active employees
        i = 0;
        while (i < len) {
            let emp = vector::borrow_mut(&mut company.employees, i);
            if (!emp.paused) {
                let payment = coin::extract(&mut treasury.coins, emp.salary);
                coin::deposit(emp.wallet, payment);
                
                emp.last_paid = timestamp::now_microseconds();
                emp.total_paid = emp.total_paid + emp.salary;
                
                let payment_log = PaymentLog {
                    timestamp: timestamp::now_microseconds(),
                    amount: emp.salary,
                    employee_name: emp.name,
                    employee_role: emp.role,
                    employee_email: emp.email,
                    employee_wallet: emp.wallet,
                    token_type: string::utf8(b"APT"),
                };
                vector::push_back(&mut company.all_payments, payment_log);
                
                event::emit_event(&mut company.salary_paid_events, SalaryPaidEvent {
                    employee_wallet: emp.wallet,
                    amount: emp.salary,
                    token_type: string::utf8(b"APT"),
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
                    
                    // Check treasury balance for this employee
                    assert!(coin::value(&treasury.coins) >= emp.salary, EINSUFFICIENT_BALANCE);
                    
                    // Transfer payment
                    let payment = coin::extract(&mut treasury.coins, emp.salary);
                    coin::deposit(employee_wallet, payment);
                    
                    // Update employee record
                    emp.last_paid = timestamp::now_microseconds();
                    emp.total_paid = emp.total_paid + emp.salary;
                    
                    // Log payment
                    let payment_log = PaymentLog {
                        timestamp: timestamp::now_microseconds(),
                        amount: emp.salary,
                        employee_name: emp.name,
                        employee_role: emp.role,
                        employee_email: emp.email,
                        employee_wallet: emp.wallet,
                        token_type: string::utf8(b"APT"),
                    };
                    vector::push_back(&mut company.all_payments, payment_log);
                    
                    // Emit event
                    event::emit_event(&mut company.salary_paid_events, SalaryPaidEvent {
                        employee_wallet: emp.wallet,
                        amount: emp.salary,
                        token_type: string::utf8(b"APT"),
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

    #[view]
    public fun get_total_active_payroll(company_address: address): u64 acquires Company {
        assert!(exists<Company>(company_address), ECOMPANY_NOT_INITIALIZED);
        let company = borrow_global<Company>(company_address);
        
        let total = 0;
        let len = vector::length(&company.employees);
        let i = 0;
        while (i < len) {
            let emp = vector::borrow(&company.employees, i);
            if (!emp.paused) {
                total = total + emp.salary;
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