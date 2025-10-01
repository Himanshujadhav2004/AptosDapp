import { Hero, Workflow, Pricing, Footer } from './components/home';
import { Background, Wrapper } from './components/global';

export default function HomePage() {
  return (
    <Background>
      <Wrapper className="py-20 relative">
        <Hero />
        <Workflow />
        <Pricing />
      </Wrapper>
      <Footer />
    </Background>
  );
}