"use client";

import { EmployeeManagement, RouteGuard } from '../components';
import { Background, Wrapper } from '../components/global';
import { Particles } from '../components/ui/Particles';
import Container from '../components/global/Container';


export default function EmployeesPage() {
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
                  Employee Management
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Add and manage your company's employees
                </p>
              </div>

              {/* Employee Management Component */}
              <EmployeeManagement contractAddress={CONTRACT_ADDRESS} />
            </div>
          </Container>
        </Wrapper>
      </Background>
    </RouteGuard>
  );
}
