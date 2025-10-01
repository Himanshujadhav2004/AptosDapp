"use client";

import { PayrollManagement, RouteGuard } from '../components';
import { Background, Wrapper } from '../components/global';
import { Particles } from '../components/ui/Particles';
import Container from '../components/global/Container';

const CONTRACT_ADDRESS = '0x8922d3e9d9b5ea2175ac47c083d1b5b83af560113481d02b03d143552d14f994';

export default function PayPage() {
  return (
    <RouteGuard requireWallet={true} requireCompany={true}>
      <Background>
        <Wrapper className="py-20 relative min-h-screen">
          <Container>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header with Particles */}
              <div className="text-center mb-16 mt-8 relative">
                <Particles
                  className="absolute inset-0 -z-10"
                  quantity={80}
                  ease={50}
                  color="#0bc3a2"
                  refresh
                />
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-semibold text-foreground mb-4 heading">
                  Payment Dashboard
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Manage employee payments and payroll operations
                </p>
              </div>

              {/* Payroll Management Component */}
              <PayrollManagement contractAddress={CONTRACT_ADDRESS} />
            </div>
          </Container>
        </Wrapper>
      </Background>
    </RouteGuard>
  );
}
