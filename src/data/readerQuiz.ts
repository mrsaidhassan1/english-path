// "Check your understanding" as multiple choice for the A1 Graded Readers (one set of 3 per story).
// The first option is always the right one; the app shuffles the options on screen.
import type { McqItem } from '../types';

const q = (question: string, right: string, ...wrong: string[]): McqItem => ({ q: question, options: [right, ...wrong], answer: 0 });

export const READER_QUIZ: Record<number, McqItem[]> = {
  1: [
    q('Is Mr Adel a teacher or a student?', 'a teacher', 'a student', 'a classmate'),
    q('Saad: "I\'m OK. I\'m ______!"', 'hungry', 'thirsty', 'tired'),
    q('Whose bag has a phone, a key and an ID card?', "Fahad's bag", "Saad's bag", "Mr Adel's bag"),
  ],
  2: [
    q('Where is Ken from?', 'Japan', 'Italy', 'Saudi Arabia'),
    q('How old is Ken?', 'nineteen', 'thirty', 'twelve'),
    q('Photo 1 is awful. Why?', "The tower isn't in the photo.", "Marco isn't in the photo.", 'It is rainy.'),
  ],
  3: [
    q('Is Khalid a doctor or a nurse?', 'a nurse', 'a doctor', 'a guard'),
    q('Why is Faisal thirsty?', 'His bottle is empty.', 'His bag is heavy.', 'The walk is boring.'),
    q('Is the walk boring or interesting?', 'interesting', 'boring', 'awful'),
  ],
  4: [
    q('Is Yousef a manager or an engineer?', 'a manager', 'an engineer', 'a coach'),
    q('Where is Bandar? (Bandar\'s mother says)', 'at the office', 'at home', 'at the bank'),
    q('Al-Hilal: one. Al-Nassr: ______.', 'zero', 'one', 'two'),
  ],
  5: [
    q('Is Nasser a waiter or a chef?', 'a waiter', 'a chef', 'a tourist'),
    q('Do the tourists speak Arabic?', "No, they don't.", 'Yes, they do.', 'Yes, a little.'),
    q('How much is the bill?', '95 riyals', '100 riyals', '5 riyals'),
  ],
  6: [
    q('What time does Khalid wake up on Sunday?', 'at five o\'clock', 'at eight o\'clock', 'at half past six'),
    q('What do Khalid and Saad buy on Friday morning?', 'water, fruit, chicken and bread', 'eggs, bread and tea', 'fish, rice and juice'),
    q('Where do they go next Friday?', 'to the beach', 'to the desert', 'to the bank'),
  ],
  7: [
    q('How long is the journey to Hail?', 'four hours', 'two hours', 'half an hour'),
    q('Why does Saad go to Hail?', 'His friend has a new baby.', 'He wants a new jacket.', 'He works in Hail.'),
    q('Which jacket does Saad buy?', 'the grey jacket: it\'s cheap', 'the black jacket: it\'s cheap', 'the grey jacket: it\'s expensive'),
  ],
  8: [
    q("How many rooms are there in Majed's flat?", 'five', 'two', 'ten'),
    q("Where is Majed's building?", 'opposite the park', 'next to the park', 'in the park'),
    q('Where are the car keys?', 'in the fridge', 'under the sofa', 'in the drawer'),
  ],
  9: [
    q('When was Grandfather born?', 'in 1952', 'in 1925', 'in Ramadan 1962'),
    q("Was Grandfather's village big or small?", 'small', 'big', 'very big'),
    q("What was Grandfather's toy?", 'a small wooden camel', 'a small goat', 'a small car'),
  ],
  10: [
    q('Who did Fahad travel to AlUla with?', 'his brother', 'Sami', 'his father'),
    q('Did they have tickets for Hegra on Friday?', "No, they didn't.", 'Yes, they did.', 'Yes, three tickets.'),
    q('What did Sami do at the weekend?', 'He stayed at home and cleaned his car.', 'He went to AlUla.', 'He went hiking.'),
  ],
  11: [
    q('Can Grandma cook well?', 'Yes, she can.', "No, she can't.", 'A little bit.'),
    q("What's the matter with the tablet?", 'The battery is empty.', "It's broken.", 'There is no Wi-Fi.'),
    q('Where is Hamad?', 'in Canada', 'in the kitchen', 'in Riyadh'),
  ],
  12: [
    q('What did the doctor say to Adel?', 'Walk every day and eat more vegetables.', 'Eat more cake and sweets.', 'Sleep more and walk less.'),
    q('What does Adel want at the bakery counter?', 'brown bread', 'cake', 'chocolate'),
    q('Is Adel more active or less active now?', 'more active', 'less active', 'the same'),
  ],
  13: [
    q('Where is Yasser right now?', 'at the shelter', 'at home', 'at the hospital'),
    q('What is Ahmed wearing?', 'only a thobe, no jacket', 'a coat and gloves', 'a jacket and a scarf'),
    q('How does the old man feel at the end?', 'pleased', 'lonely', 'worried'),
  ],
  14: [
    q('What is Turki going to study?', 'chemistry', 'English only', 'medicine'),
    q('Why is the suitcase a problem?', "It's too heavy.", "It's too small.", "It's empty."),
    q("What is Turki's dream?", 'to become a scientist', 'to become a teacher', 'to live in Canada'),
  ],
  15: [
    q('Who is Hamad in the play?', 'the king', 'a son', 'the teacher'),
    q('What advice does Mr Adel give Hamad?', 'Practise every day and read slowly.', "Don't join the play.", 'Go to the cinema.'),
    q('Hamad forgets his words. How does Fahad help?', 'He whispers the words to him.', 'He reads the words for him.', 'He claps.'),
  ],
};
