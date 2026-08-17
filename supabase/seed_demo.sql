-- =============================================================
-- TFA ASHRAYA — DEMO SEED DATA
-- Run in Supabase SQL Editor (uses service-role access)
-- =============================================================

-- -----------------------------------------------------------------
-- STEP 1: CLEAR ALL TEST DATA
-- -----------------------------------------------------------------
delete from public.case_events;
delete from public.attachments;
delete from public.case_drafts;
delete from public.cases;

-- -----------------------------------------------------------------
-- STEP 2: SEED 22 REALISTIC DEMO CASES
-- -----------------------------------------------------------------

do $$
declare
  admin_id    uuid;
  neha1_id    uuid;  -- gnikki.investments@gmail.com (Neha Gunreddy)
  pavani_id   uuid;  -- pavani74@gmail.com (Pavani)
  srinivas_id uuid;  -- nsrinivasreddy1948@gmail.com (Srinivas Reddy Nagireddy)
  neha2_id    uuid;  -- nehagunreddymail@gmail.com (Neha Gunreddy)
  c01 uuid; c02 uuid; c03 uuid; c04 uuid; c05 uuid;
  c06 uuid; c07 uuid; c08 uuid; c09 uuid; c10 uuid;
  c11 uuid; c12 uuid; c13 uuid; c14 uuid; c15 uuid;
  c16 uuid; c17 uuid; c18 uuid; c19 uuid; c20 uuid;
  c21 uuid; c22 uuid;
begin
  select id into admin_id from public.profiles where role = 'tfa_admin' limit 1;
  if admin_id is null then
    raise exception 'No tfa_admin profile found. Create one first.';
  end if;

  -- Volunteer IDs (fall back to admin_id if volunteer not yet created)
  select p.id into neha1_id    from public.profiles p join auth.users u on u.id = p.id where u.email = 'gnikki.investments@gmail.com'   limit 1;
  select p.id into pavani_id   from public.profiles p join auth.users u on u.id = p.id where u.email = 'pavani74@gmail.com'              limit 1;
  select p.id into srinivas_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'nsrinivasreddy1948@gmail.com'    limit 1;
  select p.id into neha2_id    from public.profiles p join auth.users u on u.id = p.id where u.email = 'nehagunreddymail@gmail.com'      limit 1;
  if neha1_id    is null then neha1_id    := admin_id; end if;
  if pavani_id   is null then pavani_id   := admin_id; end if;
  if srinivas_id is null then srinivas_id := admin_id; end if;
  if neha2_id    is null then neha2_id    := admin_id; end if;

  -- ── 01 · Death · Abu Dhabi · resolved  ·  reporter: Neha (gnikki.investments) ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    company_name, company_phone, company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    outcome, resolved_by, email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-050326-DE-001', 'Death', 'resolved', 'Abu Dhabi', 'Abu Dhabi',
    '2026-03-04', 'Rajesh Kumar Sharma', 'Male', 34, 'P8234567', '+971-55-4123890',
    'Al Naser Contracting LLC', '+971-2-6789012', 'Mussafah Industrial Area, Abu Dhabi', true,
    'Suresh Sharma', '+971-50-9876543', 'gnikki.investments@gmail.com',
    'Rajesh Kumar Sharma (34) died after falling from scaffolding at a construction site in Mussafah. Employer has not taken responsibility and body needs repatriation to Telangana.',
    E'Dear Sir/Madam,\n\nWe at the Telangana Friends Association (TFA) write on behalf of the family of the late Rajesh Kumar Sharma, a 34-year-old Indian national employed by Al Naser Contracting LLC at their Mussafah Industrial Area site.\n\nMr. Sharma sustained fatal injuries on 4 March 2026 following a fall from scaffolding. The employer has failed to initiate the necessary formalities for repatriation of mortal remains to Peddapalli, Telangana.\n\nWe request Mission intervention to (a) facilitate release and repatriation of mortal remains; (b) ensure the employer fulfils legal obligations under UAE Labour Law regarding compensation; (c) provide consular assistance to next-of-kin Suresh Sharma (+971-50-9876543).\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Indian national Rajesh Kumar Sharma (34) died in a construction site fall at Mussafah on 4 March 2026; employer Al Naser Contracting LLC has denied liability.\n• Mortal remains pending release; family in Peddapalli, Telangana, unable to afford repatriation costs.\n• Mission intervention sought for body release, repatriation funding, and DIAC compensation claim.',
    'Mortal remains repatriated to Peddapalli on 22 March 2026. AED 50,000 ex-gratia secured from employer under Mission facilitation. DIAC claim registered.', 'Embassy Staff (Abu Dhabi)',
    '2026-03-05 09:30:00+00', neha1_id, '2026-03-05 08:15:00+00', '2026-03-22 14:00:00+00',
    '{"body_identified": true, "death_location": "Mussafah Industrial Area, Abu Dhabi", "hospital_name": "Sheikh Khalifa Medical City", "kin_contact": "Suresh Sharma (brother) — +91-9876543210"}'
  ) returning id into c01;

  -- ── 02 · Unpaid Salary · Dubai · in_progress  ·  reporter: Pavani ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    company_name, company_phone, company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-120326-US-001', 'Unpaid Salary / Labor Exploitation', 'in_progress', 'Other emirates', 'Dubai',
    '2025-09-01', 'Priya Venkataraman', 'Female', 28, 'T3456789', '+971-52-1234567',
    'Emirates Cleaning Services LLC', '+971-4-3456789', 'Business Bay, Dubai', true,
    'Kavitha Reddy', '+971-55-7654321', 'pavani74@gmail.com',
    'Priya has not been paid salary for 6 months. Her employer confiscated her passport. She is living in a labour camp with 12 other workers in the same situation.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Ms. Priya Venkataraman, a 28-year-old Indian national employed as a cleaning supervisor by Emirates Cleaning Services LLC, Business Bay, Dubai.\n\nMs. Venkataraman has not received her contractual salary since September 2025 — six months — accumulating approximately AED 18,000 in unpaid wages. Her passport and residency documents have been confiscated by the employer, preventing any change of employment or departure.\n\nTwelve other Indian workers at the same company face identical circumstances, residing in overcrowded accommodation without adequate food.\n\nWe request the Consulate to (a) intervene with the employer for immediate document release; (b) facilitate wage recovery through the UAE Ministry of Human Resources; (c) investigate violations of UAE Labour Law Articles 56 and 60.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Priya Venkataraman (28), cleaning supervisor, 6 months unpaid (AED 18,000); passport confiscated by Emirates Cleaning Services LLC.\n• Twelve other Indian workers in the same situation at the same company — group exploitation pattern.\n• MoHRE complaint filed; Consulate intervention needed for document release and wage recovery.',
    '2026-03-12 11:00:00+00', pavani_id, '2026-03-12 10:00:00+00', '2026-04-15 09:00:00+00',
    '{"has_employer_details": true, "amount_due": 18000, "mol_complaint_filed": true}'
  ) returning id into c02;

  -- ── 03 · Missing Person · Dubai · in_progress  ·  reporter: Srinivas ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport,
    company_name, company_phone, company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-180326-MP-001', 'Missing Person', 'in_progress', 'Other emirates', 'Dubai',
    '2026-02-28', 'Arvind Tiwari', 'Male', 41, 'B7654321',
    'Gulf Logistics & Transport LLC', '+971-4-2345678', 'Jebel Ali Free Zone, Dubai', true,
    'Rekha Tiwari', '+91-8765432109', 'nsrinivasreddy1948@gmail.com',
    'My husband Arvind Tiwari went missing on 28 Feb 2026. Last spoke to him from Deira area. He works as a truck driver. His employer says he absconded but he would never leave without telling me.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Mrs. Rekha Tiwari regarding her husband, Mr. Arvind Tiwari (41), a truck driver employed by Gulf Logistics & Transport LLC, Jebel Ali Free Zone.\n\nMr. Tiwari was last in contact with his family on 28 February 2026 from the Deira area. His employer has categorised his absence as "absconding" without filing a police report or welfare check. The family fears foul play.\n\nWe request the Consulate to (a) request Dubai Police to conduct a welfare trace; (b) verify whether any absconding case led to detention; (c) assist the family with information through official channels.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Arvind Tiwari (41), truck driver, missing since 28 February 2026; employer claims absconding, family disputes this and fears foul play.\n• No police report filed; no family contact for over 3 weeks.\n• Dubai Police trace request and detention/hospital record check urgently needed.',
    '2026-03-18 14:00:00+00', srinivas_id, '2026-03-18 13:00:00+00', '2026-04-01 09:00:00+00',
    '{"last_seen_location": "Deira, Dubai", "police_complaint_filed": false, "has_employer_details": true}'
  ) returning id into c03;

  -- ── 04 · Employer Harassment · Abu Dhabi · need_more_info  ·  reporter: Neha2 ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-250326-EH-001', 'Employer Harassment / Abuse', 'need_more_info', 'Abu Dhabi', 'Abu Dhabi',
    '2026-03-01', 'Sunita Devi', 'Female', 32, 'D2345678', '+971-56-3456789',
    'Al Khalidiyah, Abu Dhabi', true,
    'Rama Krishna Rao', '+971-50-1234567', 'nehagunreddymail@gmail.com',
    'Sunita Devi is a domestic worker. She has not been paid for 8 months. Her employer took her passport and does not allow her to go out or contact family. She is forced to work 18+ hours daily.',
    E'Dear Sir/Madam,\n\nWe write urgently regarding Ms. Sunita Devi (32), a domestic helper in Al Khalidiyah, Abu Dhabi, employed since July 2025.\n\nMs. Devi reports: (a) no salary for 8 months (~AED 9,600 arrears); (b) passport confiscated by employer; (c) restricted from leaving premises or contacting family; (d) working in excess of 18 hours daily — conditions consistent with forced labour under UAE Federal Decree-Law No. 33 of 2021.\n\nWe request an urgent welfare visit to the employer''s residence and facilitation of her rescue and document recovery.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Domestic worker Sunita Devi (32) in Al Khalidiyah: 8 months unpaid (AED 9,600), passport confiscated, physically confined, working 18+ hours daily.\n• Indicators consistent with forced labour under UAE Federal Decree-Law No. 33/2021.\n• Embassy requires exact employer address to arrange welfare rescue visit — awaiting reporter confirmation.',
    '2026-03-25 10:00:00+00', neha2_id, '2026-03-25 09:00:00+00', '2026-04-10 11:00:00+00',
    '{"abuse_type": "Salary withholding, confinement, excessive working hours", "documents_withheld": true, "has_employer_details": true}'
  ) returning id into c04;

  -- ── 05 · Medical Emergency · Abu Dhabi · acknowledged  ·  reporter: Neha1 ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    company_name, company_phone, company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-020426-HM-001', 'Hospitalized / Medical Emergency', 'acknowledged', 'Abu Dhabi', 'Abu Dhabi',
    '2026-04-01', 'Arun Krishnamurthy', 'Male', 45, 'K5678901', '+971-54-5678901',
    'ADNOC Distribution', '+971-2-6971900', 'Ruwais Industrial Complex, Abu Dhabi', true,
    'Shantha Krishnamurthy', '+91-9876543210', 'gnikki.investments@gmail.com',
    'Arun was involved in a serious industrial accident at ADNOC Ruwais plant. He has severe burns on 40% of his body. He is in critical condition at Sheikh Khalifa Hospital. His family cannot afford treatment costs not covered by insurance.',
    E'Dear Sir/Madam,\n\nWe write most urgently regarding Mr. Arun Krishnamurthy (45), process technician at ADNOC Distribution, Ruwais, who sustained severe burns covering 40% body surface area in an industrial accident on 1 April 2026. He is admitted to Sheikh Khalifa Medical City Burns Unit in critical but stable condition.\n\nProjected treatment costs will significantly exceed the employer insurance cap of AED 150,000. His wife and children in Hyderabad are requesting an emergency visitor visa.\n\nWe request the Mission to (a) assist with emergency family visitor visas; (b) liaise with ADNOC on costs beyond the insurance cap; (c) provide consular support during extended hospitalisation.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Arun Krishnamurthy (45) suffered 40% body burns in an industrial accident at ADNOC Ruwais on 1 April; admitted to Sheikh Khalifa Burns Unit, critical condition.\n• Treatment costs expected to exceed insurance cap of AED 150,000; family in Hyderabad seeking emergency visitor visas.\n• Embassy assistance needed for visa facilitation and ADNOC liability engagement.',
    '2026-04-02 12:00:00+00', neha1_id, '2026-04-02 11:00:00+00', '2026-04-10 09:00:00+00',
    '{"hospital_name": "Sheikh Khalifa Medical City — Burns Unit", "admission_date": "2026-04-01", "diagnosis": "Burns 40% TBSA — industrial accident", "kin_contact_number": "+91-9876543210 (wife)", "has_employer_details": true, "has_valid_insurance": true}'
  ) returning id into c05;

  -- ── 06 · Police Case · Dubai · in_progress  ·  reporter: Pavani ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-080426-PC-001', 'Police Case / Detention', 'in_progress', 'Other emirates', 'Dubai',
    '2026-04-07', 'Vijay Pillai', 'Male', 38, 'H3456789',
    'Narayanan Pillai', '+91-9765432180', 'pavani74@gmail.com',
    'My brother Vijay was arrested on 7 April 2026 in Dubai. He is accused of theft by his employer. He has a valid visa and work permit. He is detained at Al Raffa Police Station. This may be retaliation for his earlier salary complaint.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Mr. Narayanan Pillai regarding his brother, Mr. Vijay Pillai (38), detained at Al Raffa Police Station, Bur Dubai since 7 April 2026.\n\nMr. Pillai was apprehended on a theft allegation by his employer — the same employer against whom he had recently filed a salary delay complaint, suggesting potential retaliation. He is a legal UAE resident with a valid employment visa, has no legal representation, and has been unable to contact family since detention.\n\nWe request the Consulate to (a) establish consular access at Al Raffa Police Station; (b) verify charges and bail status; (c) provide a list of empanelled legal counsel.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Vijay Pillai (38) detained at Al Raffa Police Station since 7 April on employer''s theft allegation; family believes charges are retaliatory following a salary complaint.\n• No consular access; no contact with family since arrest.\n• Consular visit, charge verification, and empanelled advocate referral needed.',
    '2026-04-08 09:00:00+00', pavani_id, '2026-04-08 08:30:00+00', '2026-04-20 10:00:00+00',
    '{"police_station": "Al Raffa Police Station, Bur Dubai", "charges": "Theft — alleged, unspecified amount", "arrest_date": "2026-04-07", "has_employer_details": false}'
  ) returning id into c06;

  -- ── 07 · Visa Fraud · Abu Dhabi · submitted  ·  reporter: Srinivas ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    created_by, created_at, updated_at, details
  ) values (
    'TFA-150426-VF-001', 'Visa Fraud / Fake Agent', 'submitted', 'Abu Dhabi', 'Abu Dhabi',
    '2026-02-15', 'Laxmi Reddy', 'Female', 26, 'R6789012', '+971-56-8901234',
    'Laxmi Reddy', '+971-56-8901234', 'nsrinivasreddy1948@gmail.com',
    'I paid AED 28,000 to an agent called Gulf Dream Jobs in Hyderabad. They promised me a hotel receptionist job in Abu Dhabi. When I arrived my visa was for a cleaning job and the salary is half of what was promised. The agent is not responding.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Ms. Laxmi Reddy (26), victim of fraudulent recruitment by "Gulf Dream Jobs," Hyderabad.\n\nMs. Reddy paid AED 28,000 (approx. INR 6.4 lakhs) on the promise of a hotel receptionist role at AED 3,000/month. On arrival in February 2026, her visa category was cleaning/housekeeping and her actual salary AED 1,200 — 60% below the contracted amount. The agent has ceased all communication.\n\nMs. Reddy is servicing a loan taken for the agent''s fee and cannot do so on her current salary. We request Mission guidance on UAE fraud reporting channels and an eMigrate complaint against the agent.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Laxmi Reddy (26) paid AED 28,000 to fake agent "Gulf Dream Jobs," Hyderabad, for a hotel receptionist role; arrived to find a cleaning job at 40% of promised salary.\n• Agent non-contactable; victim has an outstanding loan against the agent fee.\n• UAE fraud complaint and eMigrate action against the Indian recruitment agent requested.',
    srinivas_id, '2026-04-15 15:00:00+00', '2026-04-15 15:00:00+00',
    '{"amount_paid": 28000, "police_complaint_filed": false}'
  ) returning id into c07;

  -- ── 08 · Stranded · Dubai · in_progress  ·  reporter: Neha2 ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-200426-ST-001', 'Stranded Without Support', 'in_progress', 'Other emirates', 'Dubai',
    '2026-04-19', 'Anand Patel', 'Male', 29, 'N1234567', '+971-52-3456789',
    'Anand Patel', '+971-52-3456789', 'nehagunreddymail@gmail.com',
    'I arrived in Dubai 5 days ago for a job at Smart Solutions Trading. When I arrived, the employer said there is no job. I have been at Dubai Airport Terminal 2 for 5 days with no money and no food.',
    E'Dear Sir/Madam,\n\nWe write with great urgency regarding Mr. Anand Patel (29), stranded at Dubai International Airport Terminal 2 for five days.\n\nMr. Patel arrived on 19 April 2026 having accepted an offer from "Smart Solutions Trading LLC." On arrival the employer denied any job offer and refused all responsibility for accommodation, transport, or sustenance. He has no financial resources and has been subsisting minimally for five days.\n\nWe request the Consulate to (a) provide emergency humanitarian assistance at Terminal 2; (b) facilitate repatriation to India; (c) initiate proceedings against the company for deceptive recruitment.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Anand Patel (29) stranded at Dubai Airport Terminal 2 for 5 days after employer "Smart Solutions Trading LLC" denied his job offer on arrival.\n• No money, no food, no accommodation — acute humanitarian emergency.\n• Emergency assistance, repatriation, and action against the deceptive employer requested.',
    '2026-04-20 08:00:00+00', neha2_id, '2026-04-20 07:30:00+00', '2026-04-20 15:00:00+00',
    '{"current_location": "Dubai International Airport, Terminal 2 — Arrivals", "duration_stranded": "5 days as of 20 April 2026"}'
  ) returning id into c08;

  -- ── 09 · Overstay · Abu Dhabi · acknowledged  ·  reporter: Neha1 ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-280426-OS-001', 'Overstay / Illegal Status', 'acknowledged', 'Abu Dhabi', 'Abu Dhabi',
    '2025-12-31', 'Meena Nair', 'Female', 35, 'S4567890', '+971-55-9012345',
    'Meena Nair', '+971-55-9012345', 'gnikki.investments@gmail.com',
    'My visa expired on 31 December 2025. My employer cancelled my visa without telling me. I have been overstaying for 4 months. I am scared to go out. I want to go back to Kerala but cannot afford the fines.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Ms. Meena Nair (35, Kerala), who is in irregular residency status in Abu Dhabi following her employer''s unilateral cancellation of her visa in December 2025 without notification. She has been in overstay for approximately four months, accumulating fines under UAE immigration regulations.\n\nMs. Nair wishes to exit voluntarily and requires guidance on: (a) overstay fine computation and any available waiver scheme; (b) voluntary surrender and safe exit procedure; (c) whether an emergency travel document can be issued if her passport is withheld.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Meena Nair (35, Kerala) in UAE overstay for 4 months after employer secretly cancelled her visa in December 2025.\n• Fearful of approaching authorities; cannot afford accumulated fines; passport possibly withheld.\n• GDRFA amnesty procedure, fine waiver guidance, and emergency travel document advisory needed.',
    '2026-04-28 10:00:00+00', neha1_id, '2026-04-28 09:00:00+00', '2026-05-10 11:00:00+00',
    '{"visa_expiry_date": "2025-12-31", "overstay_reason": "Employer cancelled visa without informing employee", "intent_exit_or_legalize": "Exit"}'
  ) returning id into c09;

  -- ── 10 · Unpaid Salary · Dubai · resolved  ·  reporter: Pavani ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    company_name, company_phone, company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    outcome, resolved_by, email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-050526-US-002', 'Unpaid Salary / Labor Exploitation', 'resolved', 'Other emirates', 'Dubai',
    '2025-11-01', 'Sanjay Yadav', 'Male', 31, 'G8901234', '+971-54-0123456',
    'Falcon Technical Services LLC', '+971-4-8901234', 'Al Quoz Industrial, Dubai', true,
    'Sanjay Yadav', '+971-54-0123456', 'pavani74@gmail.com',
    'I am an electrician and my company has not paid me for 7 months. They keep saying next week. They also threatened to cancel my visa if I complain. I have a family in Warangal.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Mr. Sanjay Yadav (31), electrician at Falcon Technical Services LLC, Al Quoz, Dubai. Mr. Yadav has not received salary since November 2025 — seven months — with approximately AED 21,000 in arrears. The employer has explicitly threatened retaliatory visa cancellation if a labour complaint is filed, in violation of UAE Labour Law Article 62.\n\nWe request the Consulate to facilitate a MoHRE WPS complaint and ensure protection from retaliatory visa cancellation during the complaint process.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Sanjay Yadav (31), electrician, unpaid by Falcon Technical Services LLC for 7 months (AED 21,000); employer threatening visa cancellation if complaint filed.\n• Family in Warangal depending on his income; in acute financial distress.\n• MoHRE WPS complaint and anti-retaliation protection requested.',
    'AED 21,000 in arrears recovered in full through MoHRE mediation on 28 May 2026. Employer issued formal warning. Mr. Yadav successfully transferred to new sponsor.', 'Embassy Staff (Dubai)',
    '2026-05-05 10:00:00+00', pavani_id, '2026-05-05 09:30:00+00', '2026-05-28 16:00:00+00',
    '{"has_employer_details": true, "amount_due": 21000, "mol_complaint_filed": false}'
  ) returning id into c10;

  -- ── 11 · Death · Abu Dhabi · acknowledged  ·  reporter: Srinivas ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-100526-DE-002', 'Death', 'acknowledged', 'Abu Dhabi', 'Abu Dhabi',
    '2026-05-08', 'Kavya Suresh', 'Female', 27, 'Q2345678',
    'Suresh Narayanan', '+91-9812345678', 'nsrinivasreddy1948@gmail.com',
    'My sister Kavya passed away at Cleveland Clinic Abu Dhabi on 8 May 2026 due to kidney failure. She was a nurse. Her body is at the hospital morgue. We cannot afford repatriation and her employer is not cooperating.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Mr. Suresh Narayanan (+91-9812345678) following the passing of his sister, Ms. Kavya Suresh (27), a nurse who passed away at Cleveland Clinic Abu Dhabi on 8 May 2026 due to acute renal failure.\n\nHer mortal remains are at the hospital mortuary. The employer declines to assist with repatriation costs. The family in Coimbatore, Tamil Nadu, is unable to fund repatriation independently.\n\nWe request Mission assistance to (a) facilitate release of mortal remains; (b) coordinate airline repatriation to Chennai or Coimbatore; (c) explore emergency consular assistance for repatriation costs.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Kavya Suresh (27), nurse, died of renal failure at Cleveland Clinic Abu Dhabi on 8 May; remains held at hospital mortuary.\n• Employer refusing to contribute to repatriation; family in Coimbatore cannot fund independently.\n• Mission assistance needed for body release, airline coordination, and repatriation funding.',
    '2026-05-10 11:00:00+00', srinivas_id, '2026-05-10 10:00:00+00', '2026-05-10 17:00:00+00',
    '{"body_identified": true, "death_location": "Cleveland Clinic Abu Dhabi", "hospital_name": "Cleveland Clinic Abu Dhabi", "kin_contact": "Suresh Narayanan (brother) — +91-9812345678"}'
  ) returning id into c11;

  -- ── 12 · Missing Person · Dubai · acknowledged  ·  reporter: Neha2 ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport,
    company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-150526-MP-002', 'Missing Person', 'acknowledged', 'Other emirates', 'Dubai',
    '2026-05-02', 'Deepak Gupta', 'Male', 33, 'F7890123',
    'Karama, Dubai', true,
    'Ravi Gupta', '+91-9654321098', 'nehagunreddymail@gmail.com',
    'My son Deepak went missing on 2 May 2026 after a dispute with his employer about unpaid wages. He called me once saying he would do something. I am very worried about his mental state. His employer says he absconded.',
    E'Dear Sir/Madam,\n\nWe write with considerable urgency regarding Mr. Deepak Gupta (33), unreachable since 2 May 2026 following a dispute with his employer over unpaid wages.\n\nHis father reports that Mr. Gupta''s final call contained statements suggesting potential self-harm. His employer has categorised the absence as absconding — the family''s account suggests a welfare emergency requiring priority police intervention beyond a standard absconding inquiry.\n\nWe urgently request the Consulate to (a) request Dubai Police for an immediate welfare trace; (b) verify hospital and police incident records under passport F7890123; (c) provide the family with any information through official channels.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Deepak Gupta (33) unreachable since 2 May after wages dispute; final call to father contained statements suggesting possible self-harm risk.\n• Employer claims absconding — family disputes this; situation flagged as potential mental health emergency.\n• Urgent Dubai Police welfare trace and hospital/custody record check requested.',
    '2026-05-15 09:00:00+00', neha2_id, '2026-05-15 08:00:00+00', '2026-05-22 10:00:00+00',
    '{"last_seen_location": "Karama, Dubai", "police_complaint_filed": true, "has_employer_details": true}'
  ) returning id into c12;

  -- ── 13 · Employer Harassment · Abu Dhabi · in_progress  ·  reporter: Neha1 ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    company_name, company_phone, company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-220526-EH-002', 'Employer Harassment / Abuse', 'in_progress', 'Abu Dhabi', 'Abu Dhabi',
    '2026-05-18', 'Ramesh Babu', 'Male', 39, 'J5678901', '+971-56-0123456',
    'Pioneer Construction LLC', '+971-2-5678901', 'Khalifa City A, Abu Dhabi', true,
    'Ramesh Babu', '+971-56-0123456', 'gnikki.investments@gmail.com',
    'My site manager physically assaulted me because I asked about salary. I have bruising on my face. I reported to Abu Dhabi Police. I want to take legal action but my visa is under this company.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Mr. Ramesh Babu (39), construction worker at Pioneer Construction LLC, Khalifa City A, who was physically assaulted by his site supervisor on 18 May 2026 following a salary enquiry. He sustained facial bruising and has filed a police complaint with Abu Dhabi Police.\n\nMr. Babu''s residency visa is tied to the same employer, creating risk of retaliatory cancellation while he pursues assault charges.\n\nWe request the Mission to (a) advise on pursuing an assault claim while on a sponsored visa; (b) facilitate temporary employer-transfer under MoHRE provisions; (c) confirm his identity to relevant authorities as required.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Ramesh Babu (39) physically assaulted by site supervisor at Pioneer Construction LLC on 18 May; Abu Dhabi Police complaint filed, facial injuries documented.\n• Visa tied to assailant''s employer — risk of retaliatory cancellation.\n• Mission support needed for legal guidance, MoHRE employer-transfer, and identity verification for the assault case.',
    '2026-05-22 10:00:00+00', neha1_id, '2026-05-22 09:00:00+00', '2026-06-05 10:00:00+00',
    '{"abuse_type": "Physical assault by site supervisor — facial bruising", "documents_withheld": false, "has_employer_details": true}'
  ) returning id into c13;

  -- ── 14 · Medical Emergency · Dubai · resolved  ·  reporter: Pavani ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport,
    company_name, company_phone, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    outcome, resolved_by, email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-010626-HM-002', 'Hospitalized / Medical Emergency', 'resolved', 'Other emirates', 'Dubai',
    '2026-05-30', 'Geeta Singh', 'Female', 44, 'C8901234',
    'Al Futtaim Retail LLC', '+971-4-2244123', true,
    'Vikram Singh', '+91-9543210987', 'pavani74@gmail.com',
    'My wife Geeta was hit by a car near Dubai Mall on 30 May. She is in Rashid Hospital with a broken leg and internal injuries. The driver ran away. We need help with the no-fault insurance claim and her family needs to come from India.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Mr. Vikram Singh (+91-9543210987) regarding his wife, Mrs. Geeta Singh (44), struck by a hit-and-run vehicle near Dubai Mall on 30 May 2026. She is admitted to Rashid Hospital with a right femur fracture and blunt abdominal trauma requiring surgical intervention.\n\nHer husband and children in Lucknow are seeking emergency visitor visas. The family also requires consular assistance to navigate the RTA no-fault insurance claim process.\n\nWe request the Consulate to (a) expedite emergency visitor visas for the family; (b) guide on the RTA no-fault claim; (c) coordinate with Rashid Hospital on insurance and costs.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Geeta Singh (44) hit by hit-and-run driver near Dubai Mall on 30 May; Rashid Hospital with femur fracture and internal injuries requiring surgery.\n• Husband and children in Lucknow seeking emergency visitor visas.\n• RTA no-fault claim documentation and emergency family visa facilitation requested.',
    'Emergency visitor visas issued to husband and two children on 8 June 2026. RTA no-fault claim lodged; AED 35,000 interim payout received. Patient discharged 15 June with outpatient follow-up arranged.', 'Embassy Staff (Dubai)',
    '2026-06-01 09:00:00+00', pavani_id, '2026-06-01 08:00:00+00', '2026-06-15 12:00:00+00',
    '{"hospital_name": "Rashid Hospital, Dubai", "admission_date": "2026-05-30", "diagnosis": "Right femur fracture, blunt abdominal trauma — MVA", "kin_contact_number": "+91-9543210987 (husband)", "has_employer_details": true, "has_valid_insurance": true}'
  ) returning id into c14;

  -- ── 15 · Police Case · Abu Dhabi · need_more_info  ·  reporter: Srinivas ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-080626-PC-002', 'Police Case / Detention', 'need_more_info', 'Abu Dhabi', 'Abu Dhabi',
    '2026-06-07', 'Suresh Mistry', 'Male', 48, 'W9012345', '+971-50-2345678',
    'Suresh Mistry', '+971-50-2345678', 'nsrinivasreddy1948@gmail.com',
    'I was detained at Abu Dhabi Central Jail on 7 June for a cheque bounce case. My cheque bounced because my client did not pay me. I did not know issuing a bounced cheque is a criminal case in UAE. Please help.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Mr. Suresh Mistry (48), small business owner detained at Abu Dhabi Central Jail since 7 June 2026 under a cheque bounce complaint filed by a local supplier. The dishonoured cheque arose as a consequence of a client defaulting on payment to Mr. Mistry — he was unaware of UAE criminal liability under Federal Law No. 18 of 1993.\n\nHis business and his family''s visa sponsorship depend on his remaining in the UAE. We request the Mission to (a) arrange a consular visit; (b) advise on UAE settlement options; (c) provide a list of empanelled advocates in Abu Dhabi for commercial disputes.\n\nNote: Embassy requires the cheque amount and supplier name to assess settlement options.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Suresh Mistry (48), SME owner, detained at Abu Dhabi Central Jail since 7 June for a bounced cheque to a supplier — caused by upstream client default.\n• Unaware of criminal liability; business and family visas contingent on his remaining in UAE.\n• Awaiting cheque amount and supplier details from reporter to progress — consular visit and advocate referral meanwhile requested.',
    '2026-06-08 10:00:00+00', srinivas_id, '2026-06-08 09:00:00+00', '2026-06-15 11:00:00+00',
    '{"police_station": "Abu Dhabi Central Jail (remand)", "charges": "Dishonoured cheque — UAE Federal Law No. 18/1993", "arrest_date": "2026-06-07", "has_employer_details": false}'
  ) returning id into c15;

  -- ── 16 · Absconding · Dubai · submitted  ·  reporter: Neha2 ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    company_name, company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    created_by, created_at, updated_at, details
  ) values (
    'TFA-150626-AB-001', 'Absconding', 'submitted', 'Other emirates', 'Dubai',
    '2026-06-10', 'Ravi Shankar', 'Male', 36, 'E4567890', '+971-54-5678901',
    'Al Barakah Restaurants LLC', 'Deira, Dubai', true,
    'Ravi Shankar', '+971-54-5678901', 'nehagunreddymail@gmail.com',
    'I left my employer because they stopped paying me 3 months ago. Now I am staying with a friend. I heard my employer filed an absconding case against me. I want to change my visa to another employer but I am afraid of the absconding ban.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Mr. Ravi Shankar (36), formerly employed by Al Barakah Restaurants LLC, Deira, Dubai, who vacated his employer''s accommodation on 10 June 2026 following three months of non-payment of salary.\n\nHe believes his employer has subsequently filed an absconding report against him. Mr. Shankar wishes to regularise his status and transfer to a new employer, but requires guidance on: (a) implications of the absconding report on his visa record; (b) whether a labour complaint for unpaid wages can proceed simultaneously; (c) the possibility of a grace period for status regularisation.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Ravi Shankar (36) left employer Al Barakah Restaurants after 3 months unpaid; employer reportedly filed absconding case, putting his residency at risk.\n• Wants to pursue unpaid wage claim while legalising status and transferring to a new sponsor.\n• Guidance on absconding implications, concurrent labour complaint, and status regularisation requested.',
    neha2_id, '2026-06-15 14:00:00+00', '2026-06-15 14:00:00+00',
    '{"has_employer_details": true, "has_valid_visa": false, "estimated_overstay_days": 5}'
  ) returning id into c16;

  -- ── 17 · Visa Fraud · Dubai · in_progress  ·  reporter: Pavani ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-200626-VF-002', 'Visa Fraud / Fake Agent', 'in_progress', 'Other emirates', 'Dubai',
    '2026-05-15', 'Pooja Kumari', 'Female', 23, 'A0123456', '+971-52-6789012',
    'Pooja Kumari', '+971-52-6789012', 'pavani74@gmail.com',
    'I was promised a data entry job in Dubai by an agent in Patna. I paid AED 15,000. When I arrived there was no job. The company name on my visa does not exist. I have no money to go back.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Ms. Pooja Kumari (23), a victim of organised recruitment fraud. She paid AED 15,000 to a travel agent in Patna, Bihar, on the promise of a data entry position in Dubai. On arrival in May 2026, the company named on her visa was found to be fictitious. She has no income and no funds for return travel.\n\nThis appears to be part of a broader fraud targeting Tier-2 city job-seekers. We request the Consulate to (a) assist with a Dubai Police economic crimes complaint; (b) coordinate with the Indian Embassy in New Delhi for eMigrate action against the Patna agent; (c) facilitate safe repatriation.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Pooja Kumari (23) paid AED 15,000 to a fraudulent Patna-based agent for a non-existent Dubai data entry job; company on visa is fictitious.\n• Stranded with no income; possible organised fraud ring targeting Bihar/UP job-seekers.\n• Dubai Police economic crimes complaint filed; eMigrate action against agent and repatriation assistance in progress.',
    '2026-06-20 11:00:00+00', pavani_id, '2026-06-20 10:00:00+00', '2026-06-25 09:00:00+00',
    '{"amount_paid": 15000, "police_complaint_filed": true}'
  ) returning id into c17;

  -- ── 18 · Stranded · Abu Dhabi · resolved  ·  reporter: Neha1 ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    outcome, resolved_by, email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-010626-ST-002', 'Stranded Without Support', 'resolved', 'Abu Dhabi', 'Abu Dhabi',
    '2026-05-29', 'Mohammed Irfan', 'Male', 27, 'U7890123', '+971-56-4567890',
    'Mohammed Irfan', '+971-56-4567890', 'gnikki.investments@gmail.com',
    'I came with a job offer letter from Vision Tech. When I arrived, the company said the position is filled. I have been at Madinat Zayed bus station for 3 days with no money or food.',
    E'Dear Sir/Madam,\n\nWe write most urgently on behalf of Mr. Mohammed Irfan (27), stranded at Madinat Zayed Bus Station, Abu Dhabi, for three days.\n\nMr. Irfan arrived on 29 May 2026 on an offer from "Vision Tech," which upon arrival claimed the position was filled and provided no accommodation, food, or return ticket. He has had no food for three days and is sleeping at the bus station.\n\nWe request the Mission to urgently (a) provide emergency humanitarian assistance; (b) facilitate repatriation to India; (c) take action against Vision Tech for worker abandonment on arrival.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Mohammed Irfan (27) stranded at Madinat Zayed Bus Station for 3 days after employer "Vision Tech" rescinded job offer on arrival; no money, no food.\n• Acute humanitarian emergency requiring immediate Mission intervention.\n• Emergency assistance, repatriation, and employer accountability action requested.',
    'TFA volunteers provided emergency food and shelter on 1 June. Mission coordinated Air India repatriation ticket; Mr. Irfan departed to Hyderabad on 4 June 2026.', 'TFA Admin',
    '2026-06-01 07:00:00+00', neha1_id, '2026-06-01 06:30:00+00', '2026-06-04 18:00:00+00',
    '{"current_location": "Madinat Zayed Bus Station, Abu Dhabi", "duration_stranded": "3 days as of 1 June 2026"}'
  ) returning id into c18;

  -- ── 19 · Death · Dubai · acknowledged  ·  reporter: Srinivas ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-100626-DE-003', 'Death', 'acknowledged', 'Other emirates', 'Dubai',
    '2026-06-09', 'Venkatesh Rao', 'Male', 52, 'L3456789',
    'Padmavathi Rao', '+91-9432187650', 'nsrinivasreddy1948@gmail.com',
    'My husband Venkatesh Rao passed away in a road accident on Sheikh Zayed Road on 9 June 2026. He was a driver. His body is at Rashid Hospital. His employer is not taking responsibility. I am in India with our three children.',
    E'Dear Sir/Madam,\n\nWe write with deep condolence on behalf of Mrs. Padmavathi Rao (+91-9432187650) following the tragic death of her husband, Mr. Venkatesh Rao (52), a driver fatally injured in a road traffic accident on Sheikh Zayed Road on 9 June 2026. His mortal remains are at Rashid Hospital, Dubai.\n\nHis employer has initiated no repatriation formalities. Mrs. Rao and their three children in Vijayawada, Andhra Pradesh, are unable to travel to the UAE or fund repatriation independently.\n\nWe request the Consulate to (a) facilitate release of mortal remains from Rashid Hospital; (b) obtain the Dubai Police Traffic Department accident report for insurance and legal purposes; (c) assist in claiming compensation under the employer''s mandatory third-party vehicle insurance; (d) coordinate repatriation of remains to Vijayawada.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Venkatesh Rao (52), driver, killed in a road accident on Sheikh Zayed Road on 9 June; mortal remains at Rashid Hospital, Dubai.\n• Widow and 3 children in Vijayawada unable to fund repatriation; employer unresponsive.\n• Body release, Dubai Police accident report, employer third-party insurance claim, and repatriation to Vijayawada all required.',
    '2026-06-10 10:00:00+00', srinivas_id, '2026-06-10 09:00:00+00', '2026-06-10 16:00:00+00',
    '{"body_identified": true, "death_location": "Sheikh Zayed Road, Dubai — road accident", "hospital_name": "Rashid Hospital, Dubai", "kin_contact": "Padmavathi Rao (widow) — +91-9432187650, Vijayawada, AP"}'
  ) returning id into c19;

  -- ── 20 · Employer Harassment · Abu Dhabi · in_progress  ·  reporter: Neha2 ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-150626-EH-003', 'Employer Harassment / Abuse', 'in_progress', 'Abu Dhabi', 'Abu Dhabi',
    '2026-06-01', 'Fatima Bibi', 'Female', 42, 'V5678901', '+971-56-1234567',
    'Private Household (Al Mansoori family), Abu Dhabi', true,
    'Fatima Bibi', '+971-56-1234567', 'nehagunreddymail@gmail.com',
    'I am a domestic worker. My employer has not paid me for 8 months. They took my passport. They shout, call me names and sometimes slap me. I managed to call from a neighbour phone. I want to leave but do not know how.',
    E'Dear Sir/Madam,\n\nWe write with great concern regarding Ms. Fatima Bibi (42), a domestic worker who briefly contacted TFA from a neighbour''s phone. She reports: (a) no salary for 8 months (AED 9,600 arrears); (b) passport confiscated; (c) regular verbal and physical abuse; (d) confinement to the residence.\n\nThis situation exhibits human trafficking indicators under UAE Federal Law No. 51 of 2006. We urgently request a welfare rescue visit and, if the account is confirmed, facilitate removal to a place of safety, document recovery, and legal proceedings against the employer.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Domestic worker Fatima Bibi (42): 8 months unpaid (AED 9,600), passport confiscated, confined to residence, regular physical abuse — trafficking indicators present.\n• Brief contact made via neighbour''s phone; situation classified as urgent welfare emergency.\n• Welfare rescue visit, Ewaa shelter referral, police report, and document recovery in progress.',
    '2026-06-15 09:00:00+00', neha2_id, '2026-06-15 08:30:00+00', '2026-06-25 09:00:00+00',
    '{"abuse_type": "Physical assault, verbal abuse, confinement, salary withholding", "documents_withheld": true, "has_employer_details": true}'
  ) returning id into c20;

  -- ── 21 · Unpaid Salary · Dubai · submitted  ·  reporter: Pavani ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    company_name, company_phone, company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    created_by, created_at, updated_at, details
  ) values (
    'TFA-250626-US-003', 'Unpaid Salary / Labor Exploitation', 'submitted', 'Other emirates', 'Dubai',
    '2026-04-01', 'Manoj Tiwari', 'Male', 30, 'X2345678', '+971-55-2345678',
    'Golden Fork Restaurant LLC', '+971-4-7654321', 'Bur Dubai', true,
    'Manoj Tiwari', '+971-55-2345678', 'pavani74@gmail.com',
    'I work as a cook at Golden Fork Restaurant. They have not paid me for 3 months (March, April, May 2026). The owner keeps promising but nothing comes. I have a wife and child in Bihar.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Mr. Manoj Tiwari (30), cook at Golden Fork Restaurant LLC, Bur Dubai, who has not received salary for March, April, and May 2026 — approximately AED 4,500 in arrears. The restaurant owner continues to make verbal promises without payment.\n\nMr. Tiwari is the sole income earner for his wife and young child in Bihar and is under considerable financial pressure. We request the Consulate to advise on filing a WPS complaint with MoHRE.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Cook Manoj Tiwari (30) unpaid by Golden Fork Restaurant LLC for 3 months (AED 4,500); sole earner for wife and child in Bihar.\n• Owner repeatedly promising payment without follow-through.\n• WPS complaint filing and MoHRE guidance requested.',
    pavani_id, '2026-06-25 12:00:00+00', '2026-06-25 12:00:00+00',
    '{"has_employer_details": true, "amount_due": 4500, "mol_complaint_filed": false}'
  ) returning id into c21;

  -- ── 22 · Medical Emergency · Abu Dhabi · acknowledged  ·  reporter: Neha1 ──
  insert into public.cases (
    case_id, case_type, status, reporting_emirate, assigned_emirate,
    date_of_incident, name, gender, age, passport, phone,
    company_name, company_location, visa_under_company,
    reporter_name, reporter_phone, reporter_email,
    raw_description, polished_summary, case_brief,
    email_sent_at, created_by, created_at, updated_at, details
  ) values (
    'TFA-280626-HM-003', 'Hospitalized / Medical Emergency', 'acknowledged', 'Abu Dhabi', 'Abu Dhabi',
    '2026-06-20', 'Sudha Krishnan', 'Female', 50, 'Y6789012', '+971-50-7890123',
    'Emirates Schools Establishment', 'Khalifa City, Abu Dhabi', true,
    'Sudha Krishnan', '+971-50-7890123', 'gnikki.investments@gmail.com',
    'I was recently diagnosed with Stage 3 breast cancer at NMC Royal Hospital. My employer insurance covers only AED 50,000 but treatment costs are estimated at AED 180,000. I have no savings. My children are in Kerala. I need help.',
    E'Dear Sir/Madam,\n\nWe write on behalf of Ms. Sudha Krishnan (50), school administrator at Emirates Schools Establishment, Khalifa City, recently diagnosed with Stage 3 breast cancer at NMC Royal Hospital.\n\nHer oncologist''s treatment plan — surgery, chemotherapy, and radiation — is estimated at AED 180,000. Her employer insurance ceiling is AED 50,000, leaving a shortfall of AED 130,000. She has no savings and her adult children in Kerala cannot travel to assist.\n\nWe request the Mission to (a) advise on UAE humanitarian medical funds or embassy emergency assistance; (b) facilitate an ICWF support letter; (c) advise on employer obligations under UAE regulations for long-term employee illness.\n\nYours sincerely,\nTelangana Friends Association, UAE',
    E'• Sudha Krishnan (50), school administrator, diagnosed with Stage 3 breast cancer; treatment cost AED 180,000 against insurance cap of AED 50,000 — shortfall AED 130,000.\n• No savings; children in Kerala unable to provide support in UAE.\n• ICWF referral, Mission support letter, and employer illness-obligation advisory requested.',
    '2026-06-28 10:00:00+00', neha1_id, '2026-06-28 09:00:00+00', '2026-06-28 16:00:00+00',
    '{"hospital_name": "NMC Royal Hospital, Abu Dhabi", "admission_date": "2026-06-20", "diagnosis": "Stage 3 breast cancer — surgery, chemo, radiation planned", "kin_contact_number": "Children in Kerala — contact via patient", "has_employer_details": true, "has_valid_insurance": true}'
  ) returning id into c22;

  -- ================================================================
  -- AUDIT TRAIL (case_events)
  -- Acknowledgment timing: all acks within 4–12 hours of email_sent_at
  -- Target response rate: 18/19 sent cases acknowledged within 48h ≈ 95%
  -- ================================================================

  -- c01 resolved: submitted → sent → ack(+5h) → in_progress → resolved
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c01, neha1_id,  'submitted',      null,           'submitted',   null, '2026-03-05 08:15:00+00'),
    (c01, neha1_id,  'status_changed', 'submitted',    'sent',        'Urgent repatriation email sent to Embassy Abu Dhabi', '2026-03-05 09:30:00+00'),
    (c01, admin_id,  'status_changed', 'sent',         'acknowledged','Embassy confirmed receipt; contacting Al Naser Contracting', '2026-03-05 14:30:00+00'),
    (c01, admin_id,  'status_changed', 'acknowledged', 'in_progress', 'Embassy engaged DIAC; employer summoned for meeting 12 March', '2026-03-10 11:00:00+00'),
    (c01, admin_id,  'status_changed', 'in_progress',  'resolved',    'Mortal remains repatriated 22 March. AED 50,000 ex-gratia secured from employer.', '2026-03-22 14:00:00+00');

  -- c02 in_progress: submitted → sent → ack(+6h) → in_progress
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c02, pavani_id, 'submitted',      null,           'submitted',   null, '2026-03-12 10:00:00+00'),
    (c02, pavani_id, 'status_changed', 'submitted',    'sent',        'Email sent to Dubai Consulate', '2026-03-12 11:00:00+00'),
    (c02, admin_id,  'status_changed', 'sent',         'acknowledged','Consulate acknowledged — welfare officer assigned', '2026-03-12 17:00:00+00'),
    (c02, admin_id,  'status_changed', 'acknowledged', 'in_progress', 'MoHRE inspection of Emirates Cleaning Services scheduled 25 March', '2026-03-22 11:00:00+00');

  -- c03 in_progress: submitted → sent → ack(+5h) → in_progress
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c03, srinivas_id, 'submitted',      null,           'submitted',   null, '2026-03-18 13:00:00+00'),
    (c03, srinivas_id, 'status_changed', 'submitted',    'sent',        'Sent to Dubai Consulate', '2026-03-18 14:00:00+00'),
    (c03, admin_id,    'status_changed', 'sent',         'acknowledged','Dubai Police welfare inquiry initiated', '2026-03-18 19:00:00+00'),
    (c03, admin_id,    'status_changed', 'acknowledged', 'in_progress', 'Police trace ongoing; hospital records being checked for passport B7654321', '2026-04-01 09:00:00+00');

  -- c04 need_more_info: submitted → sent → ack(+5h) → need_more_info
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c04, neha2_id,  'submitted',      null,           'submitted',      null, '2026-03-25 09:00:00+00'),
    (c04, neha2_id,  'status_changed', 'submitted',    'sent',           'Urgent domestic worker welfare case sent to Embassy', '2026-03-25 10:00:00+00'),
    (c04, admin_id,  'status_changed', 'sent',         'acknowledged',   'Embassy acknowledged — welfare officer assigned', '2026-03-25 15:00:00+00'),
    (c04, admin_id,  'status_changed', 'acknowledged', 'need_more_info', 'Embassy requires exact employer address to arrange welfare rescue visit. Please confirm with reporter.', '2026-04-10 11:00:00+00');

  -- c05 acknowledged: submitted → sent → ack(+5h)
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c05, neha1_id,  'submitted',      null,        'submitted',   null, '2026-04-02 11:00:00+00'),
    (c05, neha1_id,  'status_changed', 'submitted', 'sent',        'Urgent medical case sent to Embassy Abu Dhabi', '2026-04-02 12:00:00+00'),
    (c05, admin_id,  'status_changed', 'sent',      'acknowledged','Embassy acknowledged — consular officer visiting Sheikh Khalifa on 10 April', '2026-04-02 17:00:00+00');

  -- c06 in_progress: submitted → sent → ack(+5h) → in_progress
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c06, pavani_id, 'submitted',      null,           'submitted',   null, '2026-04-08 08:30:00+00'),
    (c06, pavani_id, 'status_changed', 'submitted',    'sent',        'Sent to Dubai Consulate — detention case', '2026-04-08 09:00:00+00'),
    (c06, admin_id,  'status_changed', 'sent',         'acknowledged','Consulate acknowledged; legal welfare officer dispatched to Al Raffa', '2026-04-08 14:00:00+00'),
    (c06, admin_id,  'status_changed', 'acknowledged', 'in_progress', 'Consular visit completed 15 April. Bail application being prepared by empanelled advocate.', '2026-04-20 10:00:00+00');

  -- c07 submitted only
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c07, srinivas_id, 'submitted', null, 'submitted', null, '2026-04-15 15:00:00+00');

  -- c08 in_progress: submitted → sent → ack(+4h) → in_progress(+7h)
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c08, neha2_id,  'submitted',      null,           'submitted',   null, '2026-04-20 07:30:00+00'),
    (c08, neha2_id,  'status_changed', 'submitted',    'sent',        'Emergency sent to Dubai Consulate — person stranded at airport', '2026-04-20 08:00:00+00'),
    (c08, admin_id,  'status_changed', 'sent',         'acknowledged','Consulate acknowledged — duty officer en route to Terminal 2', '2026-04-20 12:00:00+00'),
    (c08, admin_id,  'status_changed', 'acknowledged', 'in_progress', 'Consular officer met Mr. Patel at Terminal 2; emergency food and accommodation arranged. Repatriation process initiated.', '2026-04-20 15:00:00+00');

  -- c09 acknowledged: submitted → sent → ack(+6h)
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c09, neha1_id,  'submitted',      null,        'submitted',   null, '2026-04-28 09:00:00+00'),
    (c09, neha1_id,  'status_changed', 'submitted', 'sent',        'Sent to Embassy with overstay and document retention details', '2026-04-28 10:00:00+00'),
    (c09, admin_id,  'status_changed', 'sent',      'acknowledged','Embassy acknowledged — GDRFA amnesty referral being arranged', '2026-04-28 16:00:00+00');

  -- c10 resolved: submitted → sent → ack(+5h) → in_progress → resolved
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c10, pavani_id, 'submitted',      null,           'submitted',   null, '2026-05-05 09:30:00+00'),
    (c10, pavani_id, 'status_changed', 'submitted',    'sent',        'Sent to Dubai Consulate', '2026-05-05 10:00:00+00'),
    (c10, admin_id,  'status_changed', 'sent',         'acknowledged','Consulate assigned welfare officer — MoHRE complaint filed', '2026-05-05 15:00:00+00'),
    (c10, admin_id,  'status_changed', 'acknowledged', 'in_progress', 'MoHRE mediation session scheduled 20 May', '2026-05-12 10:00:00+00'),
    (c10, admin_id,  'status_changed', 'in_progress',  'resolved',    'AED 21,000 recovered in full. Employer formally warned. New sponsor secured.', '2026-05-28 16:00:00+00');

  -- c11 acknowledged: submitted → sent → ack(+6h)
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c11, srinivas_id, 'submitted',      null,        'submitted',   null, '2026-05-10 10:00:00+00'),
    (c11, srinivas_id, 'status_changed', 'submitted', 'sent',        'Sent to Embassy — repatriation assistance for deceased nurse', '2026-05-10 11:00:00+00'),
    (c11, admin_id,    'status_changed', 'sent',      'acknowledged','Embassy acknowledged — consular officer liaising with Cleveland Clinic mortuary', '2026-05-10 17:00:00+00');

  -- c12 acknowledged: submitted → sent → ack(+5h)
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c12, neha2_id,  'submitted',      null,        'submitted',   null, '2026-05-15 08:00:00+00'),
    (c12, neha2_id,  'status_changed', 'submitted', 'sent',        'URGENT — mental health risk flag. Sent to Dubai Consulate.', '2026-05-15 09:00:00+00'),
    (c12, admin_id,  'status_changed', 'sent',      'acknowledged','Dubai Police welfare trace + hospital check initiated', '2026-05-15 14:00:00+00');

  -- c13 in_progress: submitted → sent → ack(+6h) → in_progress
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c13, neha1_id,  'submitted',      null,           'submitted',   null, '2026-05-22 09:00:00+00'),
    (c13, neha1_id,  'status_changed', 'submitted',    'sent',        'Sent to Embassy — physical assault, police complaint already filed', '2026-05-22 10:00:00+00'),
    (c13, admin_id,  'status_changed', 'sent',         'acknowledged','Embassy acknowledged — legal counsel referral arranged', '2026-05-22 16:00:00+00'),
    (c13, admin_id,  'status_changed', 'acknowledged', 'in_progress', 'Empanelled advocate engaged; MoHRE employer-transfer petition filed', '2026-06-05 10:00:00+00');

  -- c14 resolved: submitted → sent → ack(+5h) → in_progress → resolved
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c14, pavani_id, 'submitted',      null,           'submitted',   null, '2026-06-01 08:00:00+00'),
    (c14, pavani_id, 'status_changed', 'submitted',    'sent',        'Sent to Dubai Consulate — MVA with family visa request', '2026-06-01 09:00:00+00'),
    (c14, admin_id,  'status_changed', 'sent',         'acknowledged','Consulate acknowledged — emergency family visas expedited', '2026-06-01 14:00:00+00'),
    (c14, admin_id,  'status_changed', 'acknowledged', 'in_progress', 'Emergency visas approved 8 June. RTA no-fault claim lodged.', '2026-06-08 11:00:00+00'),
    (c14, admin_id,  'status_changed', 'in_progress',  'resolved',    'Patient discharged 15 June. AED 35,000 from RTA. Family returned to India 18 June.', '2026-06-15 12:00:00+00');

  -- c15 need_more_info: submitted → sent → ack(+5h) → need_more_info
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c15, srinivas_id, 'submitted',      null,           'submitted',      null, '2026-06-08 09:00:00+00'),
    (c15, srinivas_id, 'status_changed', 'submitted',    'sent',           'Sent to Embassy — cheque bounce detention case', '2026-06-08 10:00:00+00'),
    (c15, admin_id,    'status_changed', 'sent',         'acknowledged',   'Embassy acknowledged — consular visit to Abu Dhabi Central Jail scheduled', '2026-06-08 15:00:00+00'),
    (c15, admin_id,    'status_changed', 'acknowledged', 'need_more_info', 'Embassy requires: (1) cheque amount (2) supplier name to assess settlement. Please obtain from reporter.', '2026-06-15 11:00:00+00');

  -- c16 submitted only
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c16, neha2_id, 'submitted', null, 'submitted', null, '2026-06-15 14:00:00+00');

  -- c17 in_progress: submitted → sent → ack(+5h) → in_progress
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c17, pavani_id, 'submitted',      null,           'submitted',   null, '2026-06-20 10:00:00+00'),
    (c17, pavani_id, 'status_changed', 'submitted',    'sent',        'Sent to Dubai Consulate — visa fraud / stranded case', '2026-06-20 11:00:00+00'),
    (c17, admin_id,  'status_changed', 'sent',         'acknowledged','Consulate acknowledged — economic crimes unit briefed', '2026-06-20 16:00:00+00'),
    (c17, admin_id,  'status_changed', 'acknowledged', 'in_progress', 'Dubai Police economic crimes complaint filed 22 June. eMigrate complaint to MoLE in progress.', '2026-06-25 09:00:00+00');

  -- c18 resolved: submitted → sent → in_progress (TFA action) → resolved
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c18, neha1_id,  'submitted',      null,          'submitted',   null, '2026-06-01 06:30:00+00'),
    (c18, neha1_id,  'status_changed', 'submitted',   'sent',        'Emergency case sent to Embassy immediately', '2026-06-01 07:00:00+00'),
    (c18, admin_id,  'status_changed', 'sent',        'in_progress', 'TFA volunteers provided food and temporary shelter 1 June', '2026-06-01 18:00:00+00'),
    (c18, admin_id,  'status_changed', 'in_progress', 'resolved',    'Air India ticket to Hyderabad issued. Departed 4 June 2026.', '2026-06-04 18:00:00+00');

  -- c19 acknowledged: submitted → sent → ack(+6h)
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c19, srinivas_id, 'submitted',      null,        'submitted',   null, '2026-06-10 09:00:00+00'),
    (c19, srinivas_id, 'status_changed', 'submitted', 'sent',        'Sent to Dubai Consulate — road accident death, repatriation urgent', '2026-06-10 10:00:00+00'),
    (c19, admin_id,    'status_changed', 'sent',      'acknowledged','Consulate acknowledged. Traffic Police report being obtained. Rashid Hospital mortuary contacted.', '2026-06-10 16:00:00+00');

  -- c20 in_progress: submitted → sent → ack(+6h) → in_progress
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c20, neha2_id,  'submitted',      null,           'submitted',   null, '2026-06-15 08:30:00+00'),
    (c20, neha2_id,  'status_changed', 'submitted',    'sent',        'URGENT — Possible trafficking indicators. Sent to Embassy for welfare rescue.', '2026-06-15 09:00:00+00'),
    (c20, admin_id,  'status_changed', 'sent',         'acknowledged','Embassy acknowledged — welfare officer + police escort planned', '2026-06-15 15:00:00+00'),
    (c20, admin_id,  'status_changed', 'acknowledged', 'in_progress', 'Welfare rescue conducted 22 June. Individual moved to Ewaa shelter. Passport recovery and police case in progress.', '2026-06-25 09:00:00+00');

  -- c21 submitted only
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c21, pavani_id, 'submitted', null, 'submitted', null, '2026-06-25 12:00:00+00');

  -- c22 acknowledged: submitted → sent → ack(+6h)
  insert into public.case_events (case_id, actor, event_type, from_status, to_status, note, created_at) values
    (c22, neha1_id,  'submitted',      null,        'submitted',   null, '2026-06-28 09:00:00+00'),
    (c22, neha1_id,  'status_changed', 'submitted', 'sent',        'Medical financial distress case sent to Embassy Abu Dhabi', '2026-06-28 10:00:00+00'),
    (c22, admin_id,  'status_changed', 'sent',      'acknowledged','Embassy acknowledged — ICWF application and employer duty-of-care inquiry initiated', '2026-06-28 16:00:00+00');

end $$;
