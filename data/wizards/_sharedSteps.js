export const sharedWaitlistSteps = [
  {
    id: 'waitlist-offer', type: 'blocking', title: "That's okay!",
    description: 'I can add you to my waitlist so you get priority when you are ready.',
    primaryAction: { label: 'Please add me to the waitlist', stepId: 'waitlist-form' },
    secondaryAction: { label: 'Return to select the services.', action: 'close' },
  },
  {
    id: 'waitlist-form', type: 'contact-form', title: 'Introduce your email and your name',
    description: 'Check your email and keep the number I send to maintain the benefits.',
    fields: [
      { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
      { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
    ],
    checkboxes: [
      { id: 'terms', label: 'I accept the terms and conditions.', required: true },
      { id: 'newsletter', label: "I accept to receive information and emails. (I don't send spam, don't worry.)", required: false },
    ],
    next: 'waitlisted',
  },
  {
    id: 'waitlisted', type: 'completion', submitTo: 'waitlist', title: 'Now you are on the waitlist.',
    message: 'Check your email to get the id number to get the benefits in the future.',
    buttonLabel: 'Return to select the services.',
  },
];
