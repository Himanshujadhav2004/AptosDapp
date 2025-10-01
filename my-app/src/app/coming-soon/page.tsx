import Image from "next/image";
import MagicCard from "../components/ui/MagicCard";
import { Particles } from "../components/ui/Particles";

export default function ComingSoonPage() {
  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Particles className="absolute inset-0 -z-10" quantity={140} ease={80} color="#0bc3a2" />
      {/* Top video/gif */}
      <div className="flex items-center justify-center mb-6">
        <div className="w-[420px] h-[220px] mt-20 rounded-xl overflow-hidden border border-border">
          <Image src="/images/company.gif" alt="Company" width={440} height={240} className="w-full h-full object-cover" />
        </div>
      </div>
      <h1 className="text-3xl md:text-7xl font-heading font-semibold text-center mb-10">Coming Soon!</h1>

      {/* Two feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1 */}
        <MagicCard particles={false} className="bg-transparent coming-soon-card" contentClassName="!bg-transparent">
          <div className="p-4">
            <div className="w-full h-36 rounded-lg overflow-hidden border border-border mb-4">
              <Image src="/images/cs1.jpg" alt="USD1 on Aptos" width={640} height={340} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-lg font-semibold mb-3">Pay with USD1</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>USD1 on Aptos: Announced live by @DonaldJTrumpJr & @ZachWitkoff that @worldlibertyfi’s USD1 is integrating with Aptos.</li>
              <li>First Move-based Integration: Aptos becomes USD1’s first blockchain using the Move language.</li>
              <li>Fast & Efficient Rails: Chosen for its speed, low fees, and efficient infrastructure.</li>
              <li>Strengthening Aptos Ecosystem: Expands Aptos adoption in real-world payroll and payments use cases.</li>
              <li>Payroll Ready: AptosPaylance will enable salary payments directly in USD1, bridging traditional finance and Web3.</li>
            </ul>
          </div>
        </MagicCard>

        {/* Card 2 */}
        <MagicCard particles={false} className="bg-transparent coming-soon-card" contentClassName="!bg-transparent">
          <div className="p-4">
            <div className="w-full h-36 rounded-lg overflow-hidden border border-border mb-4">
              <Image src="/images/cs2.png" alt="Gateway" width={640} height={240} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-lg font-semibold mb-3">AptosPaylance Swap</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Seamless Token Transfers: A secure gateway for payroll and financial transfers within AptosPaylance.</li>
              <li>Multi-Token Swaps: Allows users to swap between Aptos (APT), USDC, and other tokens instantly.</li>
              <li>User-Friendly: Simplifies payroll processing with easy token conversion for employees and employers.</li>
              <li>Cross-Utility: Supports payments, savings, and staking through integrated token swaps.</li>
              <li>Reliable & Efficient: Built for speed, cost-efficiency, and transparency in payroll settlement.</li>
            </ul>
          </div>
        </MagicCard>
      </div>
    </div>
  );
}
