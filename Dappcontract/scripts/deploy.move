script {
    use paylance_addr::paylance_v7;
    use std::debug;

    /// Main deployment function that sets up the global registry
    /// This should be run immediately after contract deployment
    fun deploy_and_setup(deployer: &signer) {
        // Initialize the global company registry
        paylance_v7::initialize_registry(deployer);
        
        // Optional: Print success message for debugging
        debug::print(&b"Paylance contract deployed and registry initialized successfully!");
    }
}