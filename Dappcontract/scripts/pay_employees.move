script {
    use paylance_addr::paylance_v12;
    use std::debug;

    /// Pay all employees in the company (USDC)
    fun pay_all_employees_usdc(admin: &signer) {
        paylance_v12::pay_all_employees_usdc(admin);
        debug::print(&b"All employees paid successfully in USDC!");
    }
}
