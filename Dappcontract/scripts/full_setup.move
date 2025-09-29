script {
    use paylance_addr::paylance_v10;
    use std::string;
    use std::signer;
    use std::debug;

    /// Batch setup: Create company and add initial employees
    fun full_setup(
        admin: &signer,
        company_name: vector<u8>,
        company_email: vector<u8>, 
        registry_address: address,
        // First employee details
        emp1_name: vector<u8>,
        emp1_email: vector<u8>,
        emp1_wallet: address,
        emp1_role: vector<u8>,
        emp1_salary: u64,
        // Second employee details  
        emp2_name: vector<u8>,
        emp2_email: vector<u8>,
        emp2_wallet: address,
        emp2_role: vector<u8>,
        emp2_salary: u64
    ) {
        let admin_addr = signer::address_of(admin);
        
        // Create company
        let company_name_str = string::utf8(company_name);
        let company_email_str = string::utf8(company_email);
        paylance_v10::create_company(admin, company_name_str, company_email_str, registry_address);
        
        // Add first employee
        paylance_v10::add_employee(
            admin,
            string::utf8(emp1_name),
            string::utf8(emp1_email),
            emp1_wallet,
            string::utf8(emp1_role),
            emp1_salary
        );
        
        // Add second employee
        paylance_v10::add_employee(
            admin,
            string::utf8(emp2_name),
            string::utf8(emp2_email),
            emp2_wallet,
            string::utf8(emp2_role),
            emp2_salary
        );
        
        debug::print(&b"Full setup completed: Company and 2 employees added!");
        debug::print(&admin_addr);
    }
}
