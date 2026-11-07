// Fixed lists used by the form, the filters and the analysis.
// Keep these in sync with apps-script/Code.gs.

const STATES = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],
  ["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],
  ["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],
  ["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],
  ["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],
  ["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],
  ["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],
  ["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],
  ["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],
  ["WY","Wyoming"],["PR","Puerto Rico"],["GU","Guam"],["VI","U.S. Virgin Islands"],
  ["MP","Northern Mariana Islands"],["AS","American Samoa"]
];

// Notices may show either the old code (YSC, SRC, LIN, WAC, EAC, MSC) or the newer one.
const SERVICE_CENTERS = [
  ["PSC","Potomac (YSC or PSC)"],["TSC","Texas (SRC or TSC)"],["NSC","Nebraska (LIN or NSC)"],
  ["CSC","California (WAC or CSC)"],["VSC","Vermont (EAC or VSC)"],
  ["NBC","National Benefits Center (NBC or MSC)"],["HART","HART Service Center"],
  ["UNK","Unknown"]
];
const CENTER_SHORT = { PSC:"Potomac", TSC:"Texas", NSC:"Nebraska", CSC:"California", VSC:"Vermont", NBC:"NBC", HART:"HART", UNK:"Unknown" };

// stage: 0-9 waiting, 10-19 approved, 20 denied. "uscis" is the wording people see in their USCIS account.
const STATUSES = [
  { v: "received", group: "Waiting for a decision", stage: 0,
    label: "Received, no biometrics appointment yet", short: "Received",
    help: "USCIS shows \"Case Was Received\" (paper filers may see \"Case Accepted By the USCIS Lockbox\"), and you don't have a biometrics appointment yet." },
  { v: "bio_scheduled", group: "Waiting for a decision", stage: 1,
    label: "Biometrics appointment scheduled", short: "Biometrics scheduled",
    help: "You got a biometrics appointment notice, but you haven't gone yet." },
  { v: "fingerprints", group: "Waiting for a decision", stage: 2,
    label: "Biometrics done, waiting for a decision", short: "Biometrics done",
    help: "You went to your biometrics appointment. Your status may say \"Case Was Updated To Show Fingerprints Were Taken.\"" },
  { v: "reviewing", group: "Waiting for a decision", stage: 3,
    label: "Case is being actively reviewed", short: "Actively reviewed",
    help: "Your status says \"Case Is Being Actively Reviewed.\" Many people see this for weeks, so it doesn't mean a decision is close." },
  { v: "rfe_sent", group: "Waiting for a decision", stage: 3,
    label: "USCIS asked for more evidence (RFE), not answered yet", short: "RFE received",
    help: "Your status says \"Request for Evidence Was Sent\" and you haven't sent your answer yet." },
  { v: "rfe_response", group: "Waiting for a decision", stage: 3,
    label: "RFE answered, waiting for a decision", short: "RFE answered",
    help: "Your status says \"Response To USCIS' Request For Evidence Was Received.\"" },
  { v: "transferred", group: "Waiting for a decision", stage: 3,
    label: "Case transferred to another office", short: "Transferred",
    help: "Your status says \"Case Was Transferred.\" USCIS moved your case to another office." },
  { v: "approved", group: "Approved", stage: 10,
    label: "Approved, card not made yet", short: "Approved, no card yet",
    help: "Your status says \"Case Was Approved,\" but not yet that your card is being produced." },
  { v: "card_produced", group: "Approved", stage: 11,
    label: "Approved, card is being made", short: "Approved, card being made",
    help: "Your status says \"New Card Is Being Produced\" or \"Card Was Produced.\"" },
  { v: "card_mailed", group: "Approved", stage: 12,
    label: "Approved, card mailed but not received yet", short: "Approved, card mailed",
    help: "Your status says \"Card Was Mailed To Me\" or \"Card Was Picked Up By The United States Postal Service,\" but the card hasn't arrived." },
  { v: "card_delivered", group: "Approved", stage: 13,
    label: "Card received", short: "Card received",
    help: "You have your EAD card in hand." },
  { v: "denied", group: "Denied", stage: 20,
    label: "Denied", short: "Denied",
    help: "Your status says \"Case Was Denied.\"" }
];
const STATUS_BY_V = Object.fromEntries(STATUSES.map(s => [s.v, s]));

const APP_TYPES = [["initial","Initial"],["renewal","Renewal"]];
const EXPEDITE = [["no","No"],["yes","Yes"]];
const BIO_CODES = [["1","Code 1"],["2","Code 2"],["3","Code 3"],["5","Code 5"],["unsure","Not sure"]];

// Application Support Centers (biometrics locations), grouped by state.
const ASCS = {
  AK:["Anchorage"], AL:["Birmingham"], AR:["Fort Smith"], AZ:["Phoenix","Tucson","Yuma"],
  CA:["Bakersfield","Bellflower","Buena Park","El Monte","Fresno","Gardena","Imperial","La Brea","Modesto","Oakland","Oxnard","Pomona","Riverside","Sacramento","Salinas","San Diego","San Fernando","San Francisco","San Jose","San Marcos","Santa Rosa","Tustin","Wilshire"],
  CO:["Denver"], CT:["Hartford"], DE:["Dover"],
  FL:["Central Miami","Fort Myers","Ft. Lauderdale","Jacksonville","Kendall","North Miami","Orlando","Tampa","West Palm Beach"],
  GA:["Atlanta"], GU:["Agana"], HI:["Honolulu"], IA:["Des Moines"], ID:["Boise"],
  IL:["Chicago South","Naperville","Norridge","Waukegan"], IN:["Indianapolis","Michigan City"],
  KS:["Wichita"], KY:["Louisville"], LA:["New Orleans"], MA:["Boston","Lawrence"],
  MD:["Baltimore","Glenmont"], ME:["Portland"], MI:["Detroit","Grand Rapids"],
  MN:["Duluth","St Paul"], MO:["Kansas City","St Louis"], MP:["Saipan"], MS:["Jackson"],
  MT:["Helena"], NC:["Charlotte","Raleigh"], ND:["Fargo"], NE:["Omaha"], NH:["Manchester"],
  NJ:["Elizabeth","Hackensack"], NM:["Albuquerque"], NV:["Las Vegas","Reno"],
  NY:["Albany","Bronx","Brooklyn","Buffalo","Hauppauge","Long Island City","Manhattan","Port Chester","Queens/Jamaica","Syracuse"],
  OH:["Cincinnati","Cleveland","Columbus"], OK:["Oklahoma City"], OR:["Portland"],
  PA:["Philadelphia","Pittsburgh","York"], PR:["San Juan"], RI:["Providence"],
  SC:["Charleston","Greer"], SD:["Rapid City","Sioux Falls"], TN:["Memphis","Nashville"],
  TX:["Austin","Dallas North","Dallas South","El Paso","Fort Worth","Harlingen","Houston NW","Houston SE","Houston SW","Laredo","Lubbock","McAllen","San Antonio"],
  UT:["Salt Lake City"], VA:["Alexandria","Norfolk"], VI:["St Croix","St Thomas"],
  VT:["Burlington"], WA:["Seattle","Spokane","Yakima"], WI:["Milwaukee"], WV:["Charleston"], WY:["Casper"]
};

// Country of birth (optional field).
const COUNTRIES = ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burma (Myanmar)", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Democratic Republic)", "Congo (Republic)", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macau", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"];
