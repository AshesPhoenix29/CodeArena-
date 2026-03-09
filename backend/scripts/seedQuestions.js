// scripts/seedQuestions.js
// Usage: SEED_USER_ID=<uuid> node scripts/seedQuestions.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const QUESTIONS = [
  {
    title:      'Two Sum',
    slug:       'two-sum',
    difficulty: 'easy',
    topics:     ['arrays', 'hash-map'],
    is_public:  true,
    status:     'active',
    time_limit_ms: 1000,
    description: `## Problem\n\nGiven an array of integers \`nums\` and an integer \`target\`, return the **indices** of the two numbers that add up to \`target\`.\n\nYou may assume each input has **exactly one solution**, and you may not use the same element twice.`,
    constraints: `- 2 ≤ nums.length ≤ 10^4\n- -10^9 ≤ nums[i] ≤ 10^9\n- Only one valid answer exists.`,
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] = 9' },
      { input: 'nums = [3,2,4], target = 6',     output: '[1,2]', explanation: null },
    ],
    hints: [
      'Try using a hash map to store numbers you have seen.',
      'For each number, check if (target - number) exists in the map.',
    ],
    test_cases: [
      { input: '[2,7,11,15]\n9', expected: '[0,1]', is_sample: true,  is_hidden: false },
      { input: '[3,2,4]\n6',     expected: '[1,2]', is_sample: true,  is_hidden: false },
      { input: '[3,3]\n6',       expected: '[0,1]', is_sample: false, is_hidden: true  },
      { input: '[1,2,3,4,5]\n9', expected: '[3,4]', is_sample: false, is_hidden: true  },
      { input: '[-1,-2,-3]\n-5', expected: '[1,2]', is_sample: false, is_hidden: true  },
    ],
  },
  {
    title:      'Valid Parentheses',
    slug:       'valid-parentheses',
    difficulty: 'easy',
    topics:     ['stack', 'strings'],
    is_public:  true,
    status:     'active',
    description: `## Problem\n\nGiven a string \`s\` containing only \`(\`, \`)\`, \`{\`, \`}\`, \`[\` and \`]\`, determine if the input string is **valid**.`,
    constraints: `- 1 ≤ s.length ≤ 10^4\n- s consists of parentheses only \`()[]{}\``,
    examples: [
      { input: 's = "()"',     output: 'true',  explanation: null },
      { input: 's = "()[]{}"', output: 'true',  explanation: null },
      { input: 's = "(]"',     output: 'false', explanation: null },
    ],
    hints: ['Use a stack. Push opening brackets, pop when you see a closing one.'],
    test_cases: [
      { input: '()',      expected: 'true',  is_sample: true,  is_hidden: false },
      { input: '()[]{}', expected: 'true',  is_sample: true,  is_hidden: false },
      { input: '(]',     expected: 'false', is_sample: true,  is_hidden: false },
      { input: '([)]',   expected: 'false', is_sample: false, is_hidden: true  },
      { input: '{[]}',   expected: 'true',  is_sample: false, is_hidden: true  },
      { input: ']',      expected: 'false', is_sample: false, is_hidden: true  },
    ],
  },
  {
    title:      'Longest Substring Without Repeating Characters',
    slug:       'longest-substring-no-repeat',
    difficulty: 'medium',
    topics:     ['strings', 'sliding-window', 'hash-map'],
    is_public:  true,
    status:     'active',
    description: `## Problem\n\nGiven a string \`s\`, find the length of the **longest substring** without repeating characters.`,
    constraints: `- 0 ≤ s.length ≤ 5 × 10^4`,
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc"' },
      { input: 's = "bbbbb"',    output: '1', explanation: 'The answer is "b"' },
    ],
    hints: ['Use sliding window. Expand right, shrink left on duplicates.'],
    test_cases: [
      { input: 'abcabcbb', expected: '3', is_sample: true,  is_hidden: false },
      { input: 'bbbbb',    expected: '1', is_sample: true,  is_hidden: false },
      { input: 'pwwkew',   expected: '3', is_sample: false, is_hidden: true  },
      { input: '',         expected: '0', is_sample: false, is_hidden: true  },
      { input: 'dvdf',     expected: '3', is_sample: false, is_hidden: true  },
    ],
  },
  {
    title:      'Product of Array Except Self',
    slug:       'product-except-self',
    difficulty: 'medium',
    topics:     ['arrays', 'prefix-sum'],
    is_public:  true,
    status:     'active',
    description: `## Problem\n\nGiven an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all elements except \`nums[i]\`.\n\nMust run in **O(n)** without division.`,
    constraints: `- 2 ≤ nums.length ≤ 10^5\n- -30 ≤ nums[i] ≤ 30`,
    examples: [
      { input: 'nums = [1,2,3,4]',      output: '[24,12,8,6]',   explanation: null },
      { input: 'nums = [-1,1,0,-3,3]',  output: '[0,0,9,0,0]',  explanation: null },
    ],
    hints: ['Build prefix and suffix product arrays.'],
    test_cases: [
      { input: '[1,2,3,4]',      expected: '[24,12,8,6]',   is_sample: true,  is_hidden: false },
      { input: '[-1,1,0,-3,3]',  expected: '[0,0,9,0,0]',  is_sample: true,  is_hidden: false },
      { input: '[0,0]',          expected: '[0,0]',         is_sample: false, is_hidden: true  },
      { input: '[2,3,4,5]',      expected: '[60,40,30,24]', is_sample: false, is_hidden: true  },
    ],
  },
  {
    title:      'Trapping Rain Water',
    slug:       'trapping-rain-water',
    difficulty: 'hard',
    topics:     ['arrays', 'two-pointers', 'dynamic-programming'],
    is_public:  true,
    status:     'active',
    description: `## Problem\n\nGiven \`n\` non-negative integers representing an elevation map where width of each bar is \`1\`, compute how much water it can trap after raining.`,
    constraints: `- 1 ≤ n ≤ 2 × 10^4\n- 0 ≤ height[i] ≤ 10^5`,
    examples: [
      { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6', explanation: null },
      { input: 'height = [4,2,0,3,2,5]',              output: '9', explanation: null },
    ],
    hints: [
      'Water at position i = min(max_left, max_right) - height[i].',
      'Can you solve it with two pointers in O(1) space?',
    ],
    test_cases: [
      { input: '[0,1,0,2,1,0,1,3,2,1,2,1]', expected: '6', is_sample: true,  is_hidden: false },
      { input: '[4,2,0,3,2,5]',              expected: '9', is_sample: true,  is_hidden: false },
      { input: '[3,0,2,0,4]',                expected: '7', is_sample: false, is_hidden: true  },
      { input: '[1,0,1]',                    expected: '1', is_sample: false, is_hidden: true  },
      { input: '[5,4,3,2,1]',                expected: '0', is_sample: false, is_hidden: true  },
    ],
  },
  {
    title:      'Merge K Sorted Lists',
    slug:       'merge-k-sorted-lists',
    difficulty: 'hard',
    topics:     ['linked-list', 'heap', 'divide-and-conquer'],
    is_public:  true,
    status:     'active',
    description: `## Problem\n\nYou are given an array of \`k\` linked-lists, each sorted in ascending order. Merge all into one sorted linked-list and return it.`,
    constraints: `- 0 ≤ k ≤ 10^4\n- 0 ≤ lists[i].length ≤ 500`,
    examples: [
      { input: 'lists = [[1,4,5],[1,3,4],[2,6]]', output: '[1,1,2,3,4,4,5,6]', explanation: null },
      { input: 'lists = []',                       output: '[]',                explanation: null },
    ],
    hints: ['Use a min-heap, or divide and conquer merging pairwise.'],
    test_cases: [
      { input: '[[1,4,5],[1,3,4],[2,6]]', expected: '[1,1,2,3,4,4,5,6]', is_sample: true,  is_hidden: false },
      { input: '[]',                       expected: '[]',                 is_sample: true,  is_hidden: false },
      { input: '[[1]]',                    expected: '[1]',                is_sample: false, is_hidden: true  },
      { input: '[[2],[1]]',                expected: '[1,2]',              is_sample: false, is_hidden: true  },
    ],
  },
];

async function seed() {
  console.log('🌱 Seeding question bank...\n');

  const SEED_USER_ID = process.env.SEED_USER_ID;
  if (!SEED_USER_ID) {
    console.error('❌  Set SEED_USER_ID in .env or prefix the command');
    process.exit(1);
  }

  let seeded = 0;
  let skipped = 0;

  for (const q of QUESTIONS) {
    const { test_cases, ...questionData } = q;

    const { data: question, error: qErr } = await supabase
      .from('questions')
      .upsert(
        { ...questionData, created_by: SEED_USER_ID },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (qErr) {
      console.error(`  ❌  Failed: "${q.title}" —`, qErr.message);
      skipped++;
      continue;
    }

    await supabase.from('test_cases').delete().eq('question_id', question.id);

    const tcRows = test_cases.map((tc, i) => ({
      ...tc,
      question_id: question.id,
      order_index: i,
    }));

    const { error: tcErr } = await supabase.from('test_cases').insert(tcRows);

    if (tcErr) {
      console.error(`  ⚠️  Test cases failed for "${q.title}":`, tcErr.message);
    } else {
      console.log(`  ✅  ${q.title} (${q.difficulty}) — ${tcRows.length} test cases`);
      seeded++;
    }
  }

  console.log(`\n🎉  Done! Seeded: ${seeded}, Skipped: ${skipped}`);
}

seed().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});