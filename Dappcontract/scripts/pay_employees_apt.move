script {
    use paylance_addr::paylance_v10;
    use std::debug;

    /// Pay all employees in the company (APT)
    fun pay_all_employees_apt(admin: &signer) {
        paylance_v10::pay_all_employees_apt(admin);
        debug::print(&b"All employees paid successfully in APT!");
    }
}
