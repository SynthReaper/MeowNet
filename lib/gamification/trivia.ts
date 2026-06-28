// lib/gamification/trivia.ts — Predefined Educational Trivia Questions

export const TRIVIA_QUESTIONS = [
  {
    id: 'q1',
    question: 'Which of the following is the most standard technique used to safely identify a returned/sterilized cat in a stray colony?',
    options: ['Left ear tipping/notching', 'Microchip tag collars', 'Neon paw markers', 'Tattooed tail rings'],
    correctIndex: 0,
    explanation: 'Ear tipping (removing a small portion of the left ear) is the globally accepted standard to identify a neutered stray cat from a distance.'
  },
  {
    id: 'q2',
    question: 'When trapping a stray cat for TNR, what is the best food to use as bait to lure them into the trap?',
    options: ['Dry kibble', 'Highly aromatic wet food like tuna or sardines', 'Fresh raw carrots', 'White bread slices'],
    correctIndex: 1,
    explanation: 'Strong-smelling wet foods like tuna, sardines, or mackerel are the most effective bait for attracting cats into traps.'
  },
  {
    id: 'q3',
    question: 'How long should a trapped cat typically remain covered in its trap before being transported to the vet clinic?',
    options: ['Kept uncovered at all times', 'Covered with a sheet or towel to minimize stress', 'Released immediately if they vocalize', 'Left in direct sunlight'],
    correctIndex: 2,
    explanation: 'Keeping the trap covered with a sheet or towel keeps the cat calm, reduces stress, and prevents injury from thrashing.'
  },
  {
    id: 'q4',
    question: 'What is the minimum safe age for a stray kitten to undergo sterilization surgery in typical TNR protocols?',
    options: ['2 months or 2 pounds', '6 months', '1 year', '5 years'],
    correctIndex: 0,
    explanation: 'Kittens can be safely spayed or neutered once they are 2 months old or weigh at least 2 pounds.'
  },
  {
    id: 'q5',
    question: 'Which type of bedding material is recommended for outdoor winter stray shelters, as it does not absorb moisture?',
    options: ['Blankets and towels', 'Straw', 'Shredded newspaper', 'Cardboard shreds'],
    correctIndex: 1,
    explanation: 'Straw is excellent because it repels moisture. Blankets and towels absorb moisture from the air and freeze, making the shelter colder.'
  }
];
