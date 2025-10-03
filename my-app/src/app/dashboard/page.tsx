"use client";

import { EmployeeManagement, RouteGuard } from '../components';
import { Background, Wrapper } from '../components/global';
import { Particles } from '../components/ui/Particles';
import Container from '../components/global/Container';

const CONTRACT_ADDRESS = '0x8922d3e9d9b5ea2175ac47c083d1b5b83af560113481d02b03d143552d14f994';

export default function EmployeesPage() {
  return (
    <RouteGuard requireWallet={true} requireCompany={true}>
      <Background>
        <Wrapper className="py-20 relative min-h-screen">
          <Container>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

              {/* Employee Management Component */}
              <EmployeeManagement contractAddress={CONTRACT_ADDRESS} />
            </div>
          </Container>
        </Wrapper>
      </Background>
    </RouteGuard>
  );
}
