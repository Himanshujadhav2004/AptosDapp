script {
    use Dappcontract::TokenTransfer;
    
    fun transfer_tokens(sender: &signer, recipient: address, amount: u64) {
        // Example script to transfer Aptos tokens
        TokenTransfer::transfer_aptos(sender, recipient, amount);
    }
}
