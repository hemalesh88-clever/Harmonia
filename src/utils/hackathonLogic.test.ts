import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HACKATHON_TRACKS,
  INITIAL_REGISTRATIONS,
  OFFICIAL_LOGOS,
  FACULTY_COORDINATORS,
  STUDENT_COORDINATORS,
  EVENT_DETAILS,
  getNextPage,
  getPrevPage,
  filterTracks,
  filterRegistrations,
  validateTeamRegistration,
  calculateHackathonStats,
  generateRegistrationId,
  calculateRegistrationFee,
  normalizeEmail,
  normalizeMobile,
} from './hackathonLogic';

test('calculateRegistrationFee implements exact pricing rules with 4-member discount (not ₹600)', () => {
  assert.equal(calculateRegistrationFee(1), 150);
  assert.equal(calculateRegistrationFee(2), 300);
  assert.equal(calculateRegistrationFee(3), 450);
  assert.equal(calculateRegistrationFee(4), 500);
  assert.notEqual(calculateRegistrationFee(4), 600);
});

test('normalizeEmail and normalizeMobile handle edge cases and formatting', () => {
  assert.equal(normalizeEmail('  STUDENT@Gmail.COM  '), 'student@gmail.com');
  assert.equal(normalizeMobile('+91 98765 43210'), '9876543210');
  assert.equal(normalizeMobile('09876543210'), '9876543210');
  assert.equal(normalizeMobile('9876543210'), '9876543210');
});

test('validateTeamRegistration strictly validates only selected team size', () => {
  // Team size 1 (Solo): No member validation errors
  const solo = validateTeamRegistration({
    teamName: 'Solo Track Team',
    leaderName: 'Lead One',
    leaderEmail: 'lead@test.com',
    leaderMobile: '9876543210',
    institution: 'Rajalakshmi Institute of Technology',
    trackId: 'linguaverse',
    projectTitle: 'AI Speech Avatar System',
    abstract: 'Translating real-time vernacular speech into accessible audio streams.',
    memberCount: 1,
    members: [],
  });
  assert.equal(solo.valid, true);
  assert.deepEqual(solo.errors, {});

  // Team size 2: Only member 2 is validated; member 3 and member 4 produce NO errors
  const team2 = validateTeamRegistration({
    teamName: 'Duo Track Team',
    leaderName: 'Lead One',
    leaderEmail: 'lead@test.com',
    leaderMobile: '9876543210',
    institution: 'Rajalakshmi Institute of Technology',
    trackId: 'linguaverse',
    projectTitle: 'AI Speech Avatar System',
    abstract: 'Translating real-time vernacular speech into accessible audio streams.',
    memberCount: 2,
    members: [
      { name: '', email: '', mobile: '' }, // member 2 missing
    ],
  });
  assert.equal(team2.valid, false);
  assert.ok(team2.errors.member_2_name);
  assert.equal(team2.errors.member_3_name, undefined);
  assert.equal(team2.errors.member_4_name, undefined);

  // Team size 3: Only members 2 & 3 validated; member 4 produces NO errors
  const team3 = validateTeamRegistration({
    teamName: 'Trio Track Team',
    leaderName: 'Lead One',
    leaderEmail: 'lead@test.com',
    leaderMobile: '9876543210',
    institution: 'Rajalakshmi Institute of Technology',
    trackId: 'linguaverse',
    projectTitle: 'AI Speech Avatar System',
    abstract: 'Translating real-time vernacular speech into accessible audio streams.',
    memberCount: 3,
    members: [
      { name: 'Member Two', email: 'two@test.com', mobile: '9123456780' },
      { name: 'Member Three', email: 'three@test.com', mobile: '9123456781' },
    ],
  });
  assert.equal(team3.valid, true);
  assert.equal(team3.errors.member_4_name, undefined);
});

test('OFFICIAL_LOGOS maps all uploaded logos and official poster', () => {
  assert.ok(OFFICIAL_LOGOS.harmonia.includes('9.55.36_PM'));
  assert.ok(OFFICIAL_LOGOS.rit.includes('RIT_Logo_copy'));
  assert.ok(OFFICIAL_LOGOS.ieee.includes('d9390228dd804b94b88b8e40fd379e17'));
  assert.ok(OFFICIAL_LOGOS.idatamind.includes('6.38.06_PM'));
  assert.ok(OFFICIAL_LOGOS.poster.includes('9.51.19_PM'));
});

test('FACULTY_COORDINATORS and STUDENT_COORDINATORS match the exact names and numbers from the poster', () => {
  assert.equal(FACULTY_COORDINATORS.length, 4);
  assert.deepEqual(
    FACULTY_COORDINATORS.map((c) => ({ name: c.name, phone: c.phone })),
    [
      { name: 'Ms. B. Harshana', phone: '9952113855' },
      { name: 'Mr. P. Murugan', phone: '9095324739' },
      { name: 'Mrs. T. Kavitha', phone: '8754112325' },
      { name: 'Mr. Sabari Bala Sundar. S', phone: '8124932077' },
    ]
  );

  assert.equal(STUDENT_COORDINATORS.length, 5);
  assert.deepEqual(
    STUDENT_COORDINATORS.map((c) => ({ name: c.name, phone: c.phone })),
    [
      { name: 'Sathish MS', phone: '9384579988' },
      { name: 'Mohamed Jamel S', phone: '8825455681' },
      { name: 'Siva Visveshwar VJ', phone: '8610645763' },
      { name: 'Nithyasree Satish', phone: '9840747080' },
      { name: 'Harshini A', phone: '7305024560' },
    ]
  );
});

test('Multi-page navigation helpers step sequentially between pages', () => {
  assert.equal(getPrevPage('home'), null);
  assert.equal(getNextPage('home'), 'tracks');
  assert.equal(getNextPage('tracks'), 'timeline');
  assert.equal(getNextPage('timeline'), 'prizes');
  assert.equal(getNextPage('prizes'), 'faq');
  assert.equal(getNextPage('faq'), 'dashboard');
  assert.equal(getNextPage('dashboard'), null);
  assert.equal(getPrevPage('dashboard'), 'faq');
});

test('Award money is set to "Will be announced shortly" across tracks and stats', () => {
  assert.equal(EVENT_DETAILS.prizeAnnouncementText, 'Will be announced shortly');
  for (const track of HACKATHON_TRACKS) {
    assert.equal(track.prizeStatus, 'Will be announced shortly');
  }
  const stats = calculateHackathonStats(HACKATHON_TRACKS, INITIAL_REGISTRATIONS);
  assert.equal(stats.prizePoolLabel, 'Will be announced shortly');
});

test('validateTeamRegistration enforces 1-4 member limit from poster', () => {
  const invalidSize = validateTeamRegistration({
    teamName: 'Quantum Inclusion',
    leaderName: 'Alex Johnson',
    leaderEmail: 'abc@gmail.com',
    leaderMobile: '9876543210',
    institution: 'Rajalakshmi Institute of Technology',
    trackId: 'abilityx',
    projectTitle: 'Real-Time Sign Language Avatar Synthesis',
    abstract:
      'Translating public transit announcements into Indian Sign Language on low-power edge displays.',
    memberCount: 5,
  });
  assert.equal(invalidSize.valid, false);
  assert.ok(invalidSize.errors.memberCount);

  const validTeam = validateTeamRegistration({
    teamName: 'Quantum Inclusion',
    leaderName: 'Alex Johnson',
    leaderEmail: 'abc@gmail.com',
    leaderMobile: '9876543210',
    institution: 'Rajalakshmi Institute of Technology',
    trackId: 'abilityx',
    projectTitle: 'Real-Time Sign Language Avatar Synthesis',
    abstract:
      'Translating public transit announcements into Indian Sign Language on low-power edge displays.',
    memberCount: 4,
    members: [
      { name: 'M2', email: 'm2@test.com', mobile: '9876543211' },
      { name: 'M3', email: 'm3@test.com', mobile: '9876543212' },
      { name: 'M4', email: 'm4@test.com', mobile: '9876543213' },
    ],
  });
  assert.equal(validTeam.valid, true);
});

test('filterTracks and filterRegistrations filter accurately', () => {
  assert.equal(filterTracks(HACKATHON_TRACKS, 'abilityx', '').length, 1);
  assert.equal(filterRegistrations(INITIAL_REGISTRATIONS, 'linguaverse', '').length, 1);
});

test('generateRegistrationId produces format HAR-2027-XXXXX', () => {
  const id = generateRegistrationId();
  assert.match(id, /^HAR-2027-[A-Z0-9]{5}$/);
});

test('validateTeamRegistration accepts standard emails like dharshansun77@gmail.com and valid mobile', () => {
  const res = validateTeamRegistration({
    teamName: 'Neural Innovators',
    leaderName: 'Hemalesh',
    leaderEmail: 'dharshansun77@gmail.com',
    leaderMobile: '9840123456',
    institution: 'Rajalakshmi Institute of Technology',
    trackId: 'linguaverse',
    projectTitle: 'Real-Time Dialect Synthesis',
    abstract: 'Translating localized dialect speech into standard academic Tamil and English.',
    memberCount: 1,
  });
  assert.equal(res.valid, true);
  assert.deepEqual(res.errors, {});
});

test('validateTeamRegistration catches duplicate email or mobile among team members', () => {
  const duplicateEmailRes = validateTeamRegistration({
    teamName: 'Duplicate Test Team',
    leaderName: 'Lead Person',
    leaderEmail: 'lead@test.com',
    leaderMobile: '9876543210',
    institution: 'RIT',
    trackId: 'linguaverse',
    projectTitle: 'AI Test Project Submission',
    abstract: 'A very detailed abstract about our machine learning pipeline.',
    memberCount: 2,
    members: [
      { name: 'Member Two', email: 'lead@test.com', mobile: '9123456789' },
    ],
  });
  assert.equal(duplicateEmailRes.valid, false);
  assert.ok(duplicateEmailRes.errors.member_2_email.includes('unique email address and mobile number'));

  const duplicateMobileRes = validateTeamRegistration({
    teamName: 'Duplicate Mobile Team',
    leaderName: 'Lead Person',
    leaderEmail: 'lead@test.com',
    leaderMobile: '9876543210',
    institution: 'RIT',
    trackId: 'linguaverse',
    projectTitle: 'AI Test Project Submission',
    abstract: 'A very detailed abstract about our machine learning pipeline.',
    memberCount: 2,
    members: [
      { name: 'Member Two', email: 'member2@test.com', mobile: '9876543210' },
    ],
  });
  assert.equal(duplicateMobileRes.valid, false);
  assert.ok(duplicateMobileRes.errors.member_2_mobile.includes('unique email address and mobile number'));
});

test('validateTeamRegistration rejects invalid Indian mobile numbers', () => {
  const invalidMobile = validateTeamRegistration({
    teamName: 'Mobile Validation Team',
    leaderName: 'Lead Person',
    leaderEmail: 'lead@test.com',
    leaderMobile: '12345',
    institution: 'RIT',
    trackId: 'linguaverse',
    projectTitle: 'AI Test Project Submission',
    abstract: 'A very detailed abstract about our machine learning pipeline.',
    memberCount: 1,
  });
  assert.equal(invalidMobile.valid, false);
  assert.ok(invalidMobile.errors.leaderMobile);
});
