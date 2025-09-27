module Dappcontract::TokenTransfer {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    /// Error codes
    const E_INSUFFICIENT_BALANCE: u64 = 1;
    const E_INVALID_AMOUNT: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;

    /// Struct to store transfer information
    struct TransferInfo has key {
        sender: address,
        recipient: address,
        amount: u64,
        timestamp: u64,
    }

    /// Initialize the module
    fun init_module(_account: &signer) {
        // Module initialization if needed
    }

    /// Transfer Aptos tokens from sender to recipient
    public entry fun transfer_aptos(
        sender: &signer,
        recipient_addr: address,
        amount: u64
    ) {
        // Validate amount
        assert!(amount > 0, E_INVALID_AMOUNT);
        
        // Get sender's address
        let sender_addr = signer::address_of(sender);
        
        // Check if sender has sufficient balance
        let sender_balance = coin::balance<AptosCoin>(sender_addr);
        assert!(sender_balance >= amount, E_INSUFFICIENT_BALANCE);
        
        // Transfer the coins
        let transfer_coin = coin::withdraw<AptosCoin>(sender, amount);
        coin::deposit(recipient_addr, transfer_coin);
        
        // Transfer completed successfully
    }

    /// Get the balance of Aptos coins for an address
    public fun get_balance(addr: address): u64 {
        coin::balance<AptosCoin>(addr)
    }

    /// Get current timestamp
    public fun get_current_timestamp(): u64 {
        aptos_framework::timestamp::now_seconds()
    }

    /// Check if an address has sufficient balance
    public fun has_sufficient_balance(addr: address, amount: u64): bool {
        coin::balance<AptosCoin>(addr) >= amount
    }

    /// Emergency function to withdraw all Aptos coins (only for module owner)
    public fun emergency_withdraw(owner: &signer, recipient: address) {
        let owner_addr = signer::address_of(owner);
        let balance = coin::balance<AptosCoin>(owner_addr);
        
        if (balance > 0) {
            let coins = coin::withdraw<AptosCoin>(owner, balance);
            coin::deposit(recipient, coins);
        }
    }

    /// Batch transfer function - transfer to multiple recipients
    public entry fun batch_transfer(
        sender: &signer,
        recipients: vector<address>,
        amounts: vector<u64>
    ) {
        let sender_addr = signer::address_of(sender);
        let len = vector::length(&recipients);
        
        // Validate input lengths match
        assert!(len == vector::length(&amounts), E_INVALID_AMOUNT);
        
        let i = 0;
        while (i < len) {
            let recipient = *vector::borrow(&recipients, i);
            let amount = *vector::borrow(&amounts, i);
            
            // Validate amount
            assert!(amount > 0, E_INVALID_AMOUNT);
            
            // Check balance
            let balance = coin::balance<AptosCoin>(sender_addr);
            assert!(balance >= amount, E_INSUFFICIENT_BALANCE);
            
            // Transfer
            let transfer_coin = coin::withdraw<AptosCoin>(sender, amount);
            coin::deposit(recipient, transfer_coin);
            
            i = i + 1;
        };
    }
}
