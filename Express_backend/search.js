// search.js
import path from 'path';
import Database from 'better-sqlite3';
//this SHOULD make a database for you so you dont have to make one yourself, still good to have DB browser tho
const dbPath = path.resolve('./barcodes.db');
const db = new Database(dbPath);

//ensure table exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS barcodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    pname TEXT,
    time_scanned TEXT DEFAULT (datetime('now'))
  )
`).run();
//readline just allows input from command line but im sure you know ts by now

//displays barcodes in a formatted way: (code, product name, time scanned)
function displayBarcodes(barcodes) {
  if (barcodes.length === 0) {
    console.log('\nNo barcodes found.\n');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('SEARCH RESULTS:');
  console.log('='.repeat(80));
  
  barcodes.forEach((barcode, index) => {
    console.log(`\n[${index + 1}] ID: ${barcode.id}`);
    console.log(`    Barcode: ${barcode.code}`);
    console.log(`    Product: ${barcode.pname || 'N/A'}`);
    console.log(`    Scanned: ${barcode.time_scanned}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`Total: ${barcodes.length} barcode(s)\n`);
}
//searches barcodes by code, pname, or time scanned
export function searchBarcodes(searchTerm) {
  const stmt = db.prepare(`
    SELECT * FROM barcodes 
    WHERE code = ? 
       OR pname = ?
    ORDER BY time_scanned DESC
  `);
  return stmt.all(searchTerm, searchTerm); // returns an array
}
//gets all barcodes and orders them by the time scanned
export function getAllBarcodes() {
  const stmt = db.prepare('SELECT * FROM barcodes ORDER BY time_scanned DESC');
  return stmt.all();
}
//This just makes the menu look nice
function showMenu() {
  console.log('\n' + '='.repeat(50));
  console.log('BARCODE DATABASE SEARCH');
  console.log('='.repeat(50));
  console.log('1. Search barcodes');
  console.log('2. View all barcodes');
  console.log('3. Exit');
  console.log('='.repeat(50));
}
//allows jits to choose what they wanna do 
function promptUser() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  showMenu();
  rl.question('\nChoose an option (1-3): ', (option) => {
    switch(option.trim()) {
      case '1':
        rl.question('Enter search term: ', (searchTerm) => {
          const results = searchBarcodes(searchTerm);
          displayBarcodes(results);
          rl.close();
          promptUser();
        });
        break;
      case '2':
        const allBarcodes = getAllBarcodes();
        displayBarcodes(allBarcodes);
        rl.close();
        promptUser();
        break;
      case '3':
        console.log('\nGoodbye!\n');
        db.close();
        rl.close();
        break;
      default:
        console.log('\nInvalid option. Please try again.');
        rl.close();
        promptUser();
    }
  });
}

//starts ts app only if run directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1]) {
  console.log('\nConnecting to database: barcodes.db\n');
  promptUser();
}
