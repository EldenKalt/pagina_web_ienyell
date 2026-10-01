import Link from 'next/link';
import KnowMePrompt from '../components/KnowMePrompt';
import FadeIn from '../components/FadeIn';
import HeroHome from '../components/HeroHome';

export const metadata = {
  title: 'enyell — Creative Universe',
};

export default function HomePage() {
  return (
    <>
      <HeroHome />

      <FadeIn tag="section" className="cta-section">
        <div className="cta-text">
          <p className="label">What do you want to do it?</p>
          <p className="title">I want to...</p>
        </div>
        <div className="cta-buttons">
          <Link href="#" className="cta-btn cta-btn--primary">Work with You</Link>
          <Link href="/services" className="cta-btn">Explore Your Universe</Link>
          <Link href="#" className="cta-btn">Learn to Draw</Link>
          <Link href="#" className="cta-btn">Learn to Write</Link>
          <Link href="#" className="cta-btn">Buy Your Art</Link>
        </div>
      </FadeIn>

      <FadeIn>
        <KnowMePrompt />
      </FadeIn>
    </>
  );
}
