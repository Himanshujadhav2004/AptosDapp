script {
    use paylance_addr::paylance_v12;
    use std::string;
    use std::signer;
    use std::debug;

    /// Demo setup: Create a demo company with sample data
    fun demo_setup(admin: &signer, registry_address: address) {
        let admin_addr = signer::address_of(admin);
        
        // Create demo company
        paylance_v12::create_company(
            admin, 
            string::utf8(b"Demo Tech Corp"),
            string::utf8(b"admin@demotechcorp.com"),
            registry_address
        );
        
        // Add demo employees (you'll need real addresses for testing)
        paylance_v12::add_employee(
            admin,
            string::utf8(b"Alice Johnson"),
            string::utf8(b"alice@demotechcorp.com"),
            @0x42, // Replace with real address
            string::utf8(b"Senior Developer"),
            150000000 // 1.5 APT (in octas)
        );
        
        paylance_v12::add_employee(
            admin,
            string::utf8(b"Bob Smith"),
            string::utf8(b"bob@demotechcorp.com"),
            @0x43, // Replace with real address  
            string::utf8(b"Product Manager"),
            120000000 // 1.2 APT (in octas)
        );
        
        // Deposit initial funds (5 APT)
        paylance_v12::deposit_apt(admin, 500000000);
        
        debug::print(&b"Demo setup completed with sample company and employees!");
        debug::print(&admin_addr);
    }
}
