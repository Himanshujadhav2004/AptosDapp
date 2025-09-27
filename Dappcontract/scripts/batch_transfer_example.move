script {
    use Dappcontract::TokenTransfer;
    
    fun batch_transfer_tokens(sender: &signer, recipients: vector<address>, amounts: vector<u64>) {
        // Example script for batch transfers
        TokenTransfer::batch_transfer(sender, recipients, amounts);
    }
}
