'use client';

export default function InfoStep({ step }) {
  return (
    <div className="wiz-step">
      {step.image && <img className="wiz-step-image" src={step.image} alt="" />}
      <h3 className="wiz-step-title">{step.title}</h3>
      {step.description && <p className="wiz-step-description">{step.description}</p>}
      {step.bullets?.length > 0 && (
        <ul className="wiz-step-bullets">
          {step.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      )}
    </div>
  );
}
