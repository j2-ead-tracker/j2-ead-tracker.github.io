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

const SERVICE_CENTERS = [
  ["PSC","Potomac (PSC)"],["TSC","Texas (TSC)"],["NSC","Nebraska (NSC)"],
  ["CSC","California (CSC)"],["VSC","Vermont (VSC)"],["NBC","National Benefits Center (NBC)"],
  ["UNK","Unknown"]
];

// stage: 0-9 waiting, 10-19 approved, 20 denied
const STATUSES = [
  { v: "received",       label: "Case Was Received",                    stage: 0 },
  { v: "bio_scheduled",  label: "Biometrics Appointment Was Scheduled", stage: 1 },
  { v: "fingerprints",   label: "Fingerprints Were Taken",              stage: 2 },
  { v: "reviewing",      label: "Case Is Being Actively Reviewed",      stage: 3 },
  { v: "rfe_sent",       label: "Request for Evidence Was Sent",        stage: 3 },
  { v: "rfe_response",   label: "Response to RFE Was Received",         stage: 3 },
  { v: "transferred",    label: "Case Was Transferred",                 stage: 3 },
  { v: "approved",       label: "Case Was Approved",                    stage: 10 },
  { v: "card_produced",  label: "New Card Is Being Produced",           stage: 11 },
  { v: "card_mailed",    label: "Card Was Mailed To Me",                stage: 12 },
  { v: "card_delivered", label: "Card Was Delivered To Me",             stage: 13 },
  { v: "denied",         label: "Case Was Denied",                      stage: 20 }
];
const STATUS_BY_V = Object.fromEntries(STATUSES.map(s => [s.v, s]));

const APP_TYPES = [["initial","Initial"],["renewal","Renewal"]];
const EXPEDITE = [["no","No"],["yes","Yes"]];
const BIO_CODES = [["1","Code 1"],["2","Code 2"],["3","Code 3"],["5","Code 5"],["unsure","Not sure"]];
const REPORT_REASONS = [
  ["duplicate","It's a duplicate entry"],
  ["wrong_info","The details look wrong"],
  ["remove","It's my entry and I want it removed"],
  ["spam","It's spam or fake"]
];

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
