script {
    use paylance_addr::paylance;
    use std::debug;

    /// Pay all employees in the company
    fun pay_all_employees(admin: &signer) {
        paylance::pay_all_employees(admin);
        debug::print(&b"All employees paid successfully!");
    }
}
