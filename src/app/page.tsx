import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Disclaimers from "@/components/Disclaimers";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Testimonials />
        <Contact />
        <Disclaimers />
      </main>
      <Footer />
    </>
  );
}
