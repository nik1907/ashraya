// Predefined list of Indian Embassy UAE officers.
// Update this file when staff rotate — changes reflect immediately in the admin panel.

export type EmbassyOfficer = {
  name:        string
  designation: string
  mission:     'abu-dhabi' | 'dubai'
  gender:      'male' | 'female'
}

export const EMBASSY_OFFICERS: EmbassyOfficer[] = [
  // ── Embassy of India — Abu Dhabi ────────────────────────────────────────────
  { name: 'Dr. Deepak Mittal',               designation: 'Ambassador of India to the UAE',              mission: 'abu-dhabi', gender: 'male'   },
  { name: 'Mr. Rohit Mishra',                designation: 'Deputy Chief of Mission',                     mission: 'abu-dhabi', gender: 'male'   },
  { name: 'Ms. Soumya Gupta',               designation: 'Counsellor (Economic & Commerce)',              mission: 'abu-dhabi', gender: 'female' },
  { name: 'Dr. Balaji Ramaswamy',           designation: 'Counsellor (Visa & Education)',                 mission: 'abu-dhabi', gender: 'male'   },
  { name: 'Mr. Prem Chand',                designation: 'Counsellor (Consular)',                          mission: 'abu-dhabi', gender: 'male'   },
  { name: 'Group Captain Ankit Mehrotra',   designation: 'Defence Attaché',                               mission: 'abu-dhabi', gender: 'male'   },
  { name: 'Mr. Georgy George',             designation: 'First Secretary (Coordination & Community)',      mission: 'abu-dhabi', gender: 'male'   },
  { name: 'Mr. Arpit Jain',               designation: 'First Secretary (Press, Info & Culture)',          mission: 'abu-dhabi', gender: 'male'   },
  { name: 'Ms. Aayushi Sutaria',          designation: 'Second Secretary (Political)',                     mission: 'abu-dhabi', gender: 'female' },
  { name: 'Mr. Rajat Tripathi',           designation: 'Third Secretary (Translation & Interpretation)',   mission: 'abu-dhabi', gender: 'male'   },
  { name: 'Ms. Sathyanandhi G.',          designation: 'Third Secretary (Political)',                      mission: 'abu-dhabi', gender: 'female' },

  // ── Consulate General of India — Dubai ──────────────────────────────────────
  { name: 'Dr. Emmadi Vishnu Vardhan Reddy', designation: 'Consul General',                              mission: 'dubai', gender: 'male'   },
  { name: 'Shri A. K. John',               designation: 'Consul (Visa & Community Affairs)',              mission: 'dubai', gender: 'male'   },
  { name: 'Shri B. G. Krishnan',           designation: 'Consul (Economic, Trade & Commerce)',            mission: 'dubai', gender: 'male'   },
  { name: 'Smt. Ankita Wakekar',           designation: 'Consul (Welfare, Labour & Press)',               mission: 'dubai', gender: 'female' },
  { name: 'Shri Ashish Kumar Verma',       designation: 'Consul (Passport, Attestation & Political)',     mission: 'dubai', gender: 'male'   },
  { name: 'Shri Pabitra Kumar Majumder',   designation: 'Consul (Consular & Education)',                  mission: 'dubai', gender: 'male'   },
  { name: 'Shri Joydeep Mohanto',          designation: 'Head of Chancery & Consul (Protocol & Culture)', mission: 'dubai', gender: 'male'   },
  { name: 'Shri Sunil Kumar',              designation: 'Consul (Passport)',                              mission: 'dubai', gender: 'male'   },
  { name: 'Shri Hemant Dhir',             designation: 'Vice Consul (Passport)',                          mission: 'dubai', gender: 'male'   },
  { name: 'Shri Deepak Rana',             designation: 'Vice Consul (Admin & Property)',                  mission: 'dubai', gender: 'male'   },
  { name: 'Shri Piyush Kumar',            designation: 'Vice Consul (Accounts)',                          mission: 'dubai', gender: 'male'   },
  { name: 'Smt. Sachi Jain',              designation: 'Vice Consul (ICWF & Welfare)',                    mission: 'dubai', gender: 'female' },
  { name: 'Shri Abhimanyu',               designation: 'Vice Consul (Labour)',                            mission: 'dubai', gender: 'male'   },
  { name: 'Smt. Aradhana Yadav',          designation: 'Vice Consul (Consular)',                          mission: 'dubai', gender: 'female' },
  { name: 'Shri Bipin Kumar',             designation: 'Vice Consul (Visa)',                              mission: 'dubai', gender: 'male'   },
]
