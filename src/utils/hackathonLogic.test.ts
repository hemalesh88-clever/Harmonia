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
} from './hackathonLogic';

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
    institution: 'Rajalakshmi Institute of Technology',
    trackId: 'abilityx',
    projectTitle: 'Real-Time Sign Language Avatar Synthesis',
    abstract:
      'Translating public transit announcements into Indian Sign Language on low-power edge displays.',
    memberCount: 4,
  });
  assert.equal(validTeam.valid, true);
});

test('filterTracks and filterRegistrations filter accurately', () => {
  assert.equal(filterTracks(HACKATHON_TRACKS, 'abilityx', '').length, 1);
  assert.equal(filterRegistrations(INITIAL_REGISTRATIONS, 'linguaverse', '').length, 1);
});
