import Link from 'next/link';

export default function KnowMePrompt() {
  return (
    <Link href="/about" className="know-me-prompt">
      <p className="hint">Not sure?</p>
      <div className="action">
        <svg className="know-me-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        <span>Click here to know me</span>
      </div>
    </Link>
  );
}
