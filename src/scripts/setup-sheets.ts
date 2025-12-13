/**
 * Setup Script: Initialize Google Sheets with Groups
 * Run with: npx ts-node src/scripts/setup-sheets.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';
import * as path from 'path';

// Your WhatsApp groups data
const GROUPS_DATA = [
  { id: '120363181640091488@g.us', name: '#20 Internships | Jobs | Free Courses', members: 902 },
  { id: '120363194873804559@g.us', name: '#57 Internships | Jobs | Free Courses', members: 620 },
  { id: '120363421693571858@g.us', name: 'GDG On Campus TEAM 2025-26', members: 37 },
  { id: '120363409461145290@g.us', name: 'Mumbai Anveshana top 80', members: 231 },
  { id: '120363401500338989@g.us', name: 'Mumbai Students Union', members: 419 },
  { id: '120363355961801270@g.us', name: '0-1 Journey Registrations', members: 184 },
  { id: '919029910850-1528779712@g.us', name: '1-BH / Cybersecurity', members: 887 },
  { id: '919029910850-1519650182@g.us', name: '1-BH | TE Computers | MU', members: 1017 },
  { id: '120363359869590911@g.us', name: '3 - BH | FE l MU (2025-29)', members: 533 },
  { id: '120363417239771628@g.us', name: '30 DAYS FSD ENG B5 CHALLENGE', members: 1511 },
  { id: '120363418668056005@g.us', name: 'API Hacking', members: 340 },
  { id: '120363401240733357@g.us', name: 'API Hacking Community', members: 361 },
  { id: '120363236430118053@g.us', name: 'App Development', members: 203 },
  { id: '120363419771316067@g.us', name: 'Applications 2025-26 GDG On Campus', members: 56 },
  { id: '120363405215281518@g.us', name: 'ARENA FOR PLACEMENTs', members: 303 },
  { id: '120363197756948468@g.us', name: 'AscensionSphere', members: 116 },
  { id: '120363421222258113@g.us', name: 'Ask Doubt', members: 96 },
  { id: '120363371325401427@g.us', name: 'Badminton Lakshya 25', members: 224 },
  { id: '120363421380770126@g.us', name: 'BakLOL Offtopic', members: 288 },
  { id: '919029910850-1593446173@g.us', name: 'BH - Midnight Study Group', members: 521 },
  { id: '120363321409914047@g.us', name: 'BreachForce', members: 1196 },
  { id: '120363042295373512@g.us', name: 'BreachForce Community', members: 1023 },
  { id: '120363323492656056@g.us', name: 'BreachForce Resources', members: 716 },
  { id: '120363292048763855@g.us', name: 'Bug Hunting 3 Cywer Learning', members: 999 },
  { id: '120363198363154655@g.us', name: 'Bug Hunting Class 1 Cywer Learning', members: 749 },
  { id: '120363207409925123@g.us', name: 'Bug Hunting Class 2 Cywer Learning', members: 775 },
  { id: '120363392166542315@g.us', name: 'BYTECAMP 25', members: 791 },
  { id: '120363376981770420@g.us', name: 'Chakravyuha CTF Players', members: 310 },
  { id: '120363385922536912@g.us', name: 'CTF zone', members: 512 },
  { id: '120363419520071169@g.us', name: 'CTRL. ALT. ACT.1', members: 847 },
  { id: '120363028063679959@g.us', name: 'Cyber Rakshak Trainings', members: 1805 },
  { id: '120363288174532995@g.us', name: 'Cyber Shakti Foundation', members: 1737 },
  { id: '120363421686748210@g.us', name: 'Cyber Shakti Foundation G2', members: 800 },
  { id: '120363400869270716@g.us', name: 'Cyber Shakti Foundation G3', members: 739 },
  { id: '120363308100672955@g.us', name: 'Cyber Shakti Job & Internship', members: 725 },
  { id: '120363378664352134@g.us', name: 'Cyber Sprinters', members: 413 },
  { id: '120363397732379556@g.us', name: 'Cyber Sprinters 2', members: 529 },
  { id: '120363204340163352@g.us', name: 'CyberCell VIIT', members: 1029 },
  { id: '120363050392857064@g.us', name: 'CyberCell-VIT enthusiasts', members: 824 },
  { id: '120363067214336347@g.us', name: 'Cybersecurity', members: 368 },
  { id: '120363396028103889@g.us', name: 'Cybersecurity Master class', members: 322 },
  { id: '120363412305291433@g.us', name: 'Cyberstorm 2025', members: 1185 },
  { id: '120363418793397936@g.us', name: 'Cyberstorm Finalists', members: 122 },
  { id: '120363411246666264@g.us', name: 'Cyberstorm Participants', members: 834 },
  { id: '120363283508521659@g.us', name: 'Cywer Learning Learn Time', members: 1447 },
  { id: '120363401815500619@g.us', name: 'CYZIP 2025 Selected Interns', members: 418 },
  { id: '120363176312128677@g.us', name: 'Data to Generative AI', members: 114 },
  { id: '120363387546145788@g.us', name: 'Defenders Connect', members: 957 },
  { id: '120363401531128264@g.us', name: 'DevAcademix Bugbounty', members: 265 },
  { id: '120363346788005364@g.us', name: 'Digital Forensics & Cyber Investigation', members: 542 },
  { id: '120363403725318579@g.us', name: 'Discussion Group', members: 167 },
  { id: '120363047989580961@g.us', name: 'DS & ML', members: 554 },
  { id: '120363420070071077@g.us', name: 'DSA FOR PLACEMENTs', members: 299 },
  { id: '120363293631624747@g.us', name: 'EventLister', members: 1612 },
  { id: '120363418254991997@g.us', name: 'FOXXCON Meetups 2025', members: 658 },
  { id: '120363422209298650@g.us', name: 'G32 Pratiek Nagda Career Growth', members: 1023 },
  { id: '120363147302237164@g.us', name: 'GDG COMMUNITY', members: 451 },
  { id: '120363029765857773@g.us', name: 'GDG on Campus SIESGST', members: 1523 },
  { id: '120363328646794245@g.us', name: 'GDG Team 2024-25', members: 58 },
  { id: '120363189630958016@g.us', name: 'GDP 24', members: 360 },
  { id: '120363369179430905@g.us', name: 'GDP 25', members: 356 },
  { id: '120363384907300950@g.us', name: 'GDP 25 Group 2', members: 395 },
  { id: '120363420503592795@g.us', name: 'GEMINI CAMPUS AMBASSADOR', members: 142 },
  { id: '120363403462256909@g.us', name: 'GEN AI STUDY JAM 25', members: 294 },
  { id: '120363404991116247@g.us', name: 'GEN AI STUDY JAM 25 Participants', members: 284 },
  { id: '120363340381828647@g.us', name: 'Gen AI Study Jams 2024', members: 209 },
  { id: '120363391526481565@g.us', name: 'GenAI 101 with Pieces Workshop', members: 260 },
  { id: '120363371237369068@g.us', name: 'General', members: 410 },
  { id: '120363026826577207@g.us', name: 'General 2', members: 784 },
  { id: '120363393878589832@g.us', name: 'General 3', members: 334 },
  { id: '120363333711553457@g.us', name: 'General 4', members: 906 },
  { id: '120363417392782161@g.us', name: 'Gigs & Opportunities 2.0', members: 587 },
  { id: '120363417334894491@g.us', name: 'GOOGLE CLOUD ARCADE FACILITATOR', members: 151 },
  { id: '120363320076846727@g.us', name: 'Hackers Toolbox', members: 505 },
  { id: '120363402590766000@g.us', name: 'Hackers', members: 1772 },
  { id: '120363401855953689@g.us', name: 'Hackers circle main group', members: 1024 },
  { id: '120363346122848498@g.us', name: 'Hacking content and help 2', members: 1009 },
  { id: '120363167356848457@g.us', name: 'Hacktoberfest 23', members: 315 },
  { id: '120363404299075672@g.us', name: 'Haxnation Hiring Group 1', members: 1002 },
  { id: '120363400611361921@g.us', name: 'Haxnation Mumbai Group 1', members: 993 },
  { id: '120363400520420727@g.us', name: 'Haxnation Off Topic', members: 621 },
  { id: '120363320056053497@g.us', name: 'Imagine Hackathon By PAN IIT', members: 1153 },
  { id: '120363421716230561@g.us', name: 'INCUVERSE 1.0', members: 684 },
  { id: '120363421570681221@g.us', name: 'INCUVERSE 1.0 Offical', members: 188 },
  { id: '120363404777117565@g.us', name: 'Inlighn Internship I 102', members: 472 },
  { id: '120363421408104016@g.us', name: 'Inlighn Internship I 86', members: 671 },
  { id: '120363217407716822@g.us', name: 'INNOVATE - PBL riidl', members: 144 },
  { id: '120363339450060814@g.us', name: 'Innovation Cell - PCE Community', members: 279 },
  { id: '120363210204221632@g.us', name: 'INTERNSHIP TRAINING PROGRAM', members: 1375 },
  { id: '120363310676162465@g.us', name: 'Internships Jobs Free Courses U1', members: 805 },
  { id: '120363394575435625@g.us', name: 'Internships Jobs Free Courses U2', members: 794 },
  { id: '120363418775730095@g.us', name: 'Jobcode 02', members: 1022 },
  { id: '120363422932716487@g.us', name: 'Jobcode 21', members: 1204 },
  { id: '120363385706538411@g.us', name: 'Lets connect', members: 409 },
  { id: '120363298802317308@g.us', name: 'LMT TE Comps Mu 1', members: 1007 },
  { id: '120363417190480125@g.us', name: 'Meet & Connect', members: 597 },
  { id: '120363210113429183@g.us', name: 'MID SEM4 GROUP G12', members: 910 },
  { id: '120363401025782109@g.us', name: 'moneyminds', members: 335 },
  { id: '120363424293800042@g.us', name: 'MumbaiHacks 2025 Round 2', members: 1945 },
  { id: '120363401179136614@g.us', name: 'Niko pcgames 2', members: 1766 },
  { id: '120363420228838047@g.us', name: 'O(1) Placement Help NOVEMBER', members: 324 },
  { id: '120363183543932026@g.us', name: 'Ott wala account 2.0', members: 1853 },
  { id: '120363419769866248@g.us', name: 'Otthouse.co', members: 219 },
  { id: '120363387241626347@g.us', name: 'Power Bi bootcamp Skillected', members: 1291 },
  { id: '120363420493347558@g.us', name: 'Prodizzy', members: 260 },
  { id: '120363029168653780@g.us', name: 'Programming', members: 620 },
  { id: '120363421971113744@g.us', name: 'Projects and Collabs', members: 821 },
  { id: '120363415126194272@g.us', name: 'Redfox CTF', members: 246 },
  { id: '120363371665721326@g.us', name: 'Redfoxsec Community', members: 595 },
  { id: '120363217395143968@g.us', name: 'Resource Hub', members: 1005 },
  { id: '120363400683125514@g.us', name: 'riidl Connect', members: 1516 },
  { id: '120363137571911704@g.us', name: 'SIES Engineering Admission Enquiry', members: 523 },
  { id: '120363324349929686@g.us', name: 'SIH 2024-25 Participants', members: 290 },
  { id: '120363424067765014@g.us', name: 'SIH Community', members: 292 },
  { id: '120363163526456485@g.us', name: 'SKILL UP 2024-25', members: 417 },
  { id: '120363365641079808@g.us', name: 'Solutions Challenge 2025', members: 288 },
  { id: '120363395317300400@g.us', name: 'Students Dream Career', members: 158 },
  { id: '120363203712969759@g.us', name: 'SustainX Elimination Round', members: 270 },
  { id: '120363421221247425@g.us', name: 'TDC Community-1', members: 1021 },
  { id: '120363149903249873@g.us', name: 'TE SEM V Div C 2023-2027', members: 120 },
  { id: '120363148302711108@g.us', name: 'TE SEM V DIV-D 2023-2027', members: 127 },
  { id: '120363420807998757@g.us', name: 'Tech Dev Club', members: 1709 },
  { id: '120363049559127394@g.us', name: 'Tech Events in Mumbai/Pune/Bangalore', members: 496 },
  { id: '120363403381520194@g.us', name: 'Tech Jobs And Internships G-7', members: 927 },
  { id: '120363164520797789@g.us', name: 'Technical Team SIESGST', members: 898 },
  { id: '120363422384478783@g.us', name: 'TechPreneur 1.0 2025-26', members: 590 },
  { id: '120363166717565442@g.us', name: 'The MentorGyan', members: 319 },
  { id: '919029910850-1593444733@g.us', name: 'The Non Coders Community', members: 926 },
  { id: '120363029872580993@g.us', name: 'THM Mumbai Chapter', members: 1632 },
  { id: '120363193202846526@g.us', name: 'ThunderCipher', members: 1983 },
  { id: '120363423027289517@g.us', name: 'ThunderCipher 2.0', members: 519 },
  { id: '120363278547099601@g.us', name: 'TMG Internships info', members: 265 },
  { id: '120363240753456199@g.us', name: 'Trailscape Updates 02', members: 1023 },
  { id: '120363315947106723@g.us', name: 'Trekkers Path', members: 966 },
  { id: '120363068765892763@g.us', name: 'Ui UX', members: 248 },
  { id: '120363236285409779@g.us', name: 'UNITE CREATIVES', members: 1849 },
  { id: '120363402694442298@g.us', name: 'Vision GST UNOFFICIAL', members: 1673 },
  { id: '120363402134247096@g.us', name: 'Wadhwani Ignite BootCamp 2025', members: 989 },
  { id: '120363028194750711@g.us', name: 'Web 3.0', members: 304 },
  { id: '120363048084988133@g.us', name: 'Web Dev', members: 585 },
  { id: '120363300573297222@g.us', name: 'Webinar & Study Material', members: 275 },
  { id: '120363232816858564@g.us', name: 'Workshop & Challenges', members: 963 },
  { id: '120363318974312349@g.us', name: 'Xploitathon', members: 103 },
  { id: '120363403043206145@g.us', name: 'Xploitathon CTF Community', members: 126 },
  { id: '120363401874724620@g.us', name: 'Xploitathon-IC25 Participants', members: 115 },
  { id: '120363370496613934@g.us', name: 'Zero Trust Defenders Hub', members: 452 },
  { id: '120363420073774846@g.us', name: 'CSI COUNCIL 2025-26', members: 89 },
  { id: '120363422671091699@g.us', name: 'CSI SIES x Utopia Himachal Trip', members: 174 },
  { id: '120363318556581516@g.us', name: 'CSI SIESGST COUNCIL 2024-25', members: 153 },
];

// Sheet configuration
const SHEETS_CONFIG = {
  GROUPS: {
    name: 'Groups',
    headers: ['groupId', 'groupName', 'isActive', 'adminGroupId', 'addedAt'],
  },
  DAILY_STATS: {
    name: 'DailyStats',
    headers: ['date', 'groupId', 'groupName', 'totalMembers', 'joinedToday', 'leftToday', 'netGrowth', 'notes'],
  },
  SNAPSHOTS: {
    name: 'Snapshots',
    headers: ['timestamp', 'groupId', 'groupName', 'totalMembers'],
  },
};

async function setupSheets() {
  console.log('='.repeat(60));
  console.log('Setting up Google Sheets with your groups...');
  console.log('='.repeat(60));

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials/service-account.json';

  if (!spreadsheetId) {
    console.error('Error: GOOGLE_SHEETS_ID not set in .env');
    process.exit(1);
  }

  try {
    // Authenticate
    const auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(credentialsPath),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

    console.log(`\nExisting sheets: ${existingSheets.join(', ') || 'None'}`);

    // Create sheets if they don't exist
    for (const [, config] of Object.entries(SHEETS_CONFIG)) {
      if (!existingSheets.includes(config.name)) {
        console.log(`Creating sheet: ${config.name}`);
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: { properties: { title: config.name } }
            }]
          }
        });
      }

      // Add headers
      console.log(`Setting headers for: ${config.name}`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${config.name}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [config.headers]
        }
      });
    }

    // Add groups to the Groups sheet
    const today = new Date().toISOString().split('T')[0];
    const groupRows = GROUPS_DATA
      .filter(g => g.members >= 100) // Only groups with 100+ members
      .map(g => [
        g.id,
        g.name,
        'TRUE',
        '', // adminGroupId - you can set this later
        today
      ]);

    console.log(`\nAdding ${groupRows.length} groups to the Groups sheet...`);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Groups!A2',
      valueInputOption: 'RAW',
      requestBody: {
        values: groupRows
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('Setup complete!');
    console.log('='.repeat(60));
    console.log(`\nGroups sheet: ${groupRows.length} groups added`);
    console.log('DailyStats sheet: Ready (will be auto-populated)');
    console.log('Snapshots sheet: Ready (will be auto-populated)');
    console.log('\nYou can now run: ./start.sh capture');

  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

setupSheets();
