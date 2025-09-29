script {
    use paylance_addr::paylance_v12;
    use std::string;
    use std::signer;
    use std::debug;

    /// Initialize a new company after deployment
    /// Usage: This creates the first company for the deployer
    fun initialize_company(
        admin: &signer, 
        company_name: vector<u8>,
        company_email: vector<u8>,
        registry_address: address
    ) {
        // Convert byte arrays to strings
        let name = string::utf8(company_name);
        let email = string::utf8(company_email);
        
        // Create the company
        paylance_v12::create_company(admin, name, email, registry_address);
        
        debug::print(&b"Company created successfully!");
        debug::print(&signer::address_of(admin));
    }
}