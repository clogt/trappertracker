#!/usr/bin/env node
/**
 * Parse Reese's trapper location data
 * Extracts addresses and prepares for geocoding
 */

const rawData = `
FOUNTAIN

✓✓9300 block of S Silver Lake Rd

18300 blk Sorrells Dr
12000 blk Oak St
Poinsettia St
11600 blk Cowels Rd
12500 blk Owenwood Rd
200 blk of Hwy 231
12500 blk Silver Lake Rd
1900 blk Jasmine St
11700 blk Gardenia St
22900 blk Sandy Mountain -Church Rd
12500 blk Greenbriar Dr
11900 blk Harrington Rd
11900 blk Holly Lane
12500 blk Boersma Rd

MEXICO BEACH

100 blk N 27th St

TYNDALL AFB

100 blk Fam Camp Rd

SOUTHPORT

7500 blk Kingswood Rd
7th Street
Dorothy Farris Rd
150 blk James
3800 blk George Lane
Willow Wood Rd
3400 blk New Church Rd
1200 blk 2nd Street
7800 blk Riley Rd
7300 blk Port Place St
9200 blk McCann Rd
3800 blk Long Rd
1100 blk 5th St
7600 blk Hwy 2302
1500 blk Nassau St
1300 blk Mylisa Rd
3800 blk Buckhorn Cir✓✓
40 blk Hidalgo Dr
700 blk Heavener Lane
12400 blk Massimiani Dr

LYNN HAVEN area

1800 blk Pond Lane (TRAPS & DUMPS IN WOODS)

4100 blk Hwy 389 (East Ave)
2200 blk Emory St
Ravenwood Court
4000 blk Woodridge Rd (Hwy 390 -& North shore)
The HAMMOCKS works at -BCAS
1900 blk Minnesota Ave
3900 blk Genoa Cir
1600 blk Santa Anita Dr
Robert (Bob) Dana Brinkman, -Nature Walk Golf Course, BB Gun
3400 blk Hillcrest Dr (self -admitted)

CALLAWAY

✓✓800 blk Plantation Way

200 blk S Charlene Dr
5200 blk Collins Dr
4700 blk E Bay Dr
6000 blk Ivy Rd
Claudia's Way
7500 blk Lilly St
540 blk Blue Heron Dr
500 blk Tracey Dr
500 blk Gay Ave (3 on Gay!)
1000 blk Katherine Ave
6600 blk Minneola
6100 blk Harvey St
2900 blk Clearview Ave
270 blk Orinda St
7500 blk Shadow Bay Dr
1300 blk Riva Cir
700 blk Gay Ave
5900 blk Wallace Rd
300 blk James St Apt A
6000 blk Lance St (Traps & -dumps)
500 blk Star Ave
7000 blk Sunrise Point
4700 blk Alameda St
5300 blk Robert Holmes Dr
500 blk Mockingbird Dr
900 blk Dogwood Way x2
5500 blk Boatrace Rd C1
220 blk Viola Ave
200 blk Sukoshi Dr
300 blk N Comet Ave
1100 blk S Gay Ave
7000 blk Lois St
200 blk Nelle St
200 blk Maryella Ave
6900 blk Ross Rd, Callaway Point
Plantation Point by Old Bicycle Rd

YOUNGSTOWN ~BAYOU GEORGE areas

8100 blk Bayou George Dr
8300 blk Klondyke Rd
6400 blk Pinetree Trail
7600 Blueberry Rd (Sweetwater Village) 32404
Waverly Rd., Youngstown
8200 blk Brandon Rd
7100 blk Campflowers
Creek Run ~ Bayhead
5900 blk Wedgewood Cir
6400 blk Campflowers Rd
Cluster Rd (Sweetwater)
6100 blk Breezy Lane
7300 blk Campflowers Rd
Pinetree Rd 32404
7200 blk Elder Ct
4900 blk Magnolia Ave
10100 blk Davenport Ave
8800 blk Creek Run Rd, Bayhead
7300 blk Coe Rd, Bayou George
14500 blk Gainer Rd, Youngstown
6900 blk Bayou George Dr, in -(Sweetwater Village)
5000 blk Pretty Way PC x2
7000 blk Keiber Cir Bayou George
6500 blk Lake Suzzanne CT -(Sweetwater Village)
5500 blk Hathaway Rd, Bayou -George
6500 blk Lake Joanna Cir -(Sweetwater Village)
BYLSMA MANOR ESTATES ~Bylsma Circle Blow Darts

HIGHLAND PARK

✓✓2700 blk Ten Acre Rd

Gamefarm Rd
Ten Acre Rd
2800 blk Orlando Rd
3600 blk Eagle Lane
3500 blk Orlando Rd
3500 blk Baldwin Rd
3500 blk Eagle Lane x2
3000 blk Gamefarm Rd
2900 blk Canal Ave
2500 blk Fern Ave

MILLVILLE, SPRINGFIELD, PARKER areas

✓✓700 blk Helen Ave SF
✓✓500 blk Bob Little Rd
✓✓3700 blk 6th St 32401

4900 blk Donalson Rd Parker
4700 blk Park Blvd Parker
8100 blk Heritage Woods Dr
900 blk East Ave (takes to Parker City Hall for pick up)
5100 blk Lance St
5000 blk Lakewood Dr
Janice Dr Parker
400 blk N Gray Ave
1200 blk Hammonds Dr SF
600 blk Flight Ave Springfield
3500 blk St John's St Springfield
1000 blk West St Parker
900 blk Kraft Ave Millville
3100 blk 3rd St Springfield
800 blk 9th Plaza Parker ✓✓
1300 blk Stratford Ave Parker
1001 Park St, Parker City Hall ✓
200 blk Sims Ave Springfield
3700 blk E 13th CT, Springfield
200 blk Central Ave 32401
5100 blk 13th CT, Springfield
1000 blk Pratt Ave, Parker
2900 blk E Hwy 98 Springfield
500 blk Spring Ave, Millville
700 blk Joan Lane Springfield
1000 blk Nottingham Dr -Springfield
2500 blk Fern Ave

PANAMA CITY BEACH

✓✓ 6400 blk Sunset Ave 32408
✓✓ 500 blk Dogwood St PCB

5600 blk South Lagoon Dr
100 blk Country Pl x 2
100 blk Coral Dr 32413
2500 blk Dorothy Ave., address listed as 17200 blk of Front Bch Rd
✓✓ 480 blk of Paradise Blvd
1600 blk Acre Cir
1300 blk Harbour Way
8100 blk South Lagoon Dr
4300 blk Catherine St
300 blk Sundial St
Crooked Oak Court
22400 blk Front Bch Rd
6400 blk Summer Oak Dr
100 blk Kimberly Dr
Breakfast Point, Basin Bayou Dr
200 blk Moonraker Cir
300 blk Brynn CT
200 blk Carolyn Ave
3700 blk Mariner Dr
440 blk Water Oak Cir
600 blk Evergreen St ✓
9500 blk Front Bch Rd~business
2000 blk Hinson Ave
4300 blk Thomas Dr~Condo
16800 blk Front Bch Rd~Condo
100 blk Royal Palm Blvd
16800 blk Front Bch Rd 32413
200 blk Seahorse Way
10300 blk Clarence St
100 blk Evergreen St✓✓
900 blk Laurel Oak Lane
100 blk San Vincente St
100 blk San Souci St
1700 blk Paddock Club Dr
4200 blk Catharine St
6700 blk Big Daddy Dr
19900 blk 1st Ave
400 blk Wahoo Rd
900 blk Beach Way
200 blk Palm Cir
5400 blk Pinetree Ave PCB ✓✓
100 blk Jeanette Ave
8200 blk Surf Dr
2500 blk Shady Oak CT x 2
100 blk Turtle Cove
19800 blk PCB Pkwy
800 blk Longwood Cir
100 blk Rusty Gans Dr
300 blk Prudence Lane
300 blk Jase Ct. GL
19300 blk Front Bch Rd
200 blk 13th St WE
100 blk Grand Heron Dr GL
2700 blk Pleasant Oak Dr x2 ✓
7200 blk N Lagoon Dr GL
300 blk Laureno PL WE
200 blk Lahan Blvd WE
200 blk Malaga PL WE
8500 blk Lydia Lane GL
22000 blk Belgrade Ave WE
100 blk Lakeview Circle WE
12000 Veal Rd trapping @12200 -blk PCB Pkwy
19900 blk Front Bch Rd off 12th
2000 blk Twin Oaks Dr GL
2800 blk Banyan St GL✓✓
17100 blk Guava Ave WE
8600 blk Toqua Rd "G" Apt
600 blk Live Oak Lane GL
7100 blk Hwy 98 Apt 11-
2100 blk Allison Ave GL ✓✓
17200 blk Front Bch Rd
7900 blk Front Bch Rd Traps @ -2400 blk W 20th St PC
8900 blk Front Bch Rd ~Motel
8200 blk S Lagoon Dr traps at -6100 blk Orange Plaza GL
8800 blk Crooked Creek Dr
200 blk Scooter Dr GL
100 blk Downing St WE
2100 blk Bent Oak CT GL
600 blk Malaga PL WE
100 blk N Wells St WE
19900 blk Alta Vista Dr WE
200 blk Circle Dr WE
5300 blk Beach Dr PCB GL
15400 blk Front Bch Rd Gulf -World
250 blk Marlin Cir, Bay Point GL
600 blk Amberjack, Bay Point GL
200 blk Lahan Blvd WE
200 blk Deluna Pl WE
19900 blk Bonita Dr PCB WE traps -@ 300 blk Carol Pl WE
Allison Way Apts, 1600 blk Allison -Ave GL✓✓
22100 blk Bataan Ave WE
300 blk Gardenia St
700 blk Westwood Bch Cir
1600 blk Hope Cir
100 blk Carolyn Ave
400 blk Water Oak Circle GL
300 blk Derondo St
100 blk Country PL
200 blk Squid Lane GL
17600 blk Front Bch Rd
600 blk Malaga PL x3 WE
200 blk Squid Lane x2 GL
9800 blk Front Bch Rd
200 blk Lake PL
100 blk Oleander Dr
21600 blk Pompano Ave
100 blk Sun Lane
2000 blk Hinson Ave & traps @ -2000 blk Hinson Ave 3
100 blk White Sandy Dr, Gulf -Highlands
1100 blk Sandal Lane
9700 blk Front Bch Rd ✓✓

PANAMA CITY areas

✓✓ 3700 blk 6th St 32401
✓✓2700 blk 12th St 32401
✓✓1900 blk 2nd Plaza 32401
✓✓2100 blk 29th Ct 32405
✓✓2700 blk Ten Acre Rd

4600 blk Crestbrook Dr PC traps at 4000 blk Woodridge Rd PC
7600 blk Blueberry Rd 32404
✓✓4900 blk E Bus 98 32404
500 blk Maine Ave 32401
200 blk of S Charlene Dr 32404
7200 blk Cherry Street 32404
500 blk of Mockingbird Dr PC
6000 blk Business 98 Townhomes
2700 blk 8th St 32401
1100 blk Balboa Ave (School)
2800 blk 13th St 32401
1800 blk Beck Ave
2405 blk Stanford Rd
2600 blk Mound Ave
Isabella Ave
MacArthur Ave
800 blk Longwood Cir
1300 blk Drake Ave
8100 Heritage Woods Dr
3100 blk Lanny Lane
2500 blk Velma Ave
3200 blk 3rd St apt
1500 blk Chandlee Avenue ✓
1300 blk Gulf Ave
1300 blk Buena Vista Blvd
1300 blk Ware Dr
1400 blk W 16th St
3700 blk W 22nd Ct
1700 blk Hickory Ave (St Andrews)
Stewart Dr
1700 blk Chaucer Lane
7500 blk Coleridge Rd
2400 BLK W 21st St x 2
4100 blk Cherry St
2400 blk 20th St PC ✓✓
1000 blk 24th Plaza 32405
1500 blk Mulberry
1100 blk Clay Ave ✓
2700 blk Briarcliff Rd
400 blk 2nd St 32401
2400 blk Frontier Lane
River Pond Rd
7200 blk Ellie B Dr
1500 blk Wilmont Ave
2600 blk Grant Ave
100 blk Kristine Blvd
700 blk Sheffield Ave
4200 blk W 19th St (Apts)
1300 blk Drake Ave PC
4700 blk 6th Street 32404
100 blk Cove Lane 32401
2200 Beck Ave Apts
2607 blk Grant Ave x 2
2100 blk Briawood Cir PC
1300 blk Clay Ave ✓
1500 blk Flower Ave PC
300 blk Bonita Ave
1100 blk Calhoun Ave, St -Andrews
1800 blk Calhoun Ave, St -Andrews
1100 blk Mulberry Ave x2
600 blk W 14th St ✓
1100 blk Clay Ave
1600 blk Michigan Ave
2400 blk Drummond Ave
900 blk McKenzie Ave
1 Seaport Dr ~PC Port Authority
BC Health Department ~11th St
Eagles Landing Apartments 2800 -blk Harrison Ave
1200 blk Mulberry Ave
2700 blk 19th St
800 blk Oak Ave
2400 blk W 20th St ✓
900 blk 2nd Plaza (Cove)
700 blk Helen Ave ✓
1900 blk Calhoun Ave, St -Andrews
2100 blk 29th CT
1500 blk 11th St
800 blk State Ave
4900 blk Magnolia Ave
1300 blk Oakland Dr
300 blk W Beach Dr
3900 blk 21st PL
2800 blk Frankford Ave
900 blk McKenzie Ave x2
200 blk Sherman Ave
2100 blk W 29th CT
2900 blk 14th St
2700 blk East Ave
100 blk Clair Dr (Cove)
808 W 11th St (BC Gov build.)
1300 blk Wilmont Ave (St -Andrews)
2500 blk 12th St (St Andrews)
600 blk Williams Ave
2600 blk Parkwood Dr
2500 blk Velma Ave 32405
100 blk Joy Cir
1900 blk Monroe Ave
1300 blk Caldwell Dr
3300 blk Pretty Bayou CT
`;

// Parse the data
function parseData() {
    const lines = rawData.trim().split('\n');
    const locations = [];
    let currentArea = '';

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Check if this is an area header (ALL CAPS, no "blk")
        if (line === line.toUpperCase() && !line.includes('BLK') && !line.includes('✓') && line.length > 5) {
            currentArea = line;
            continue;
        }

        // Skip if it's just notes without address
        if (!line.match(/\d/) && !line.includes('Ave') && !line.includes('St') && !line.includes('Rd') && !line.includes('Dr') && !line.includes('Cir') && !line.includes('Ct')) {
            continue;
        }

        // Extract isNew marker
        const isNew = line.includes('✓✓');

        // Clean up the address
        let address = line.replace(/✓✓/g, '').trim();

        // Extract notes in parentheses
        const notesMatch = address.match(/\((.*?)\)/);
        const notes = notesMatch ? notesMatch[1] : '';
        address = address.replace(/\(.*?\)/g, '').trim();

        // Extract special markers
        let specialNotes = [];
        if (notes) specialNotes.push(notes);
        if (address.includes('~')) {
            const parts = address.split('~');
            address = parts[0].trim();
            specialNotes.push(parts[1].trim());
        }
        if (address.includes('x2')) {
            specialNotes.push('Multiple reports (x2)');
            address = address.replace('x2', '').trim();
        }
        if (address.includes('x 2')) {
            specialNotes.push('Multiple reports (x2)');
            address = address.replace('x 2', '').trim();
        }
        if (address.includes('x3')) {
            specialNotes.push('Multiple reports (x3)');
            address = address.replace('x3', '').trim();
        }

        // Expand "blk" to "block"
        address = address.replace(/\bblk\b/gi, 'block');

        // Determine city based on area and ZIP code
        let city = 'Panama City';
        let zipCode = '';

        // Extract ZIP code if present
        const zipMatch = address.match(/\b(\d{5})\b/);
        if (zipMatch) {
            zipCode = zipMatch[1];
            address = address.replace(zipMatch[0], '').trim();
        }

        // Determine city from area or markers
        if (currentArea.includes('PANAMA CITY BEACH') || address.includes('PCB')) {
            city = 'Panama City Beach';
            address = address.replace(/\bPCB\b/g, '').trim();
        } else if (currentArea.includes('MEXICO BEACH')) {
            city = 'Mexico Beach';
        } else if (currentArea.includes('SOUTHPORT')) {
            city = 'Southport';
        } else if (currentArea.includes('LYNN HAVEN')) {
            city = 'Lynn Haven';
        } else if (currentArea.includes('CALLAWAY')) {
            city = 'Callaway';
        } else if (currentArea.includes('FOUNTAIN')) {
            city = 'Fountain';
        } else if (currentArea.includes('TYNDALL')) {
            city = 'Tyndall AFB';
        } else if (currentArea.includes('YOUNGSTOWN') || currentArea.includes('BAYOU GEORGE')) {
            city = 'Youngstown';
        } else if (currentArea.includes('HIGHLAND PARK')) {
            city = 'Highland Park';
        } else if (currentArea.includes('MILLVILLE')) {
            city = 'Millville';
        } else if (currentArea.includes('SPRINGFIELD')) {
            city = 'Springfield';
        } else if (currentArea.includes('PARKER')) {
            city = 'Parker';
        }

        // Handle special city markers in address
        if (address.includes('SF')) {
            city = 'Springfield';
            address = address.replace(/\bSF\b/g, '').trim();
        }
        if (address.includes('Parker')) {
            city = 'Parker';
        }
        if (address.includes('Millville')) {
            city = 'Millville';
        }
        if (address.includes('Springfield')) {
            city = 'Springfield';
        }
        if (address.includes('GL')) {
            specialNotes.push('Grand Lagoon area');
            address = address.replace(/\bGL\b/g, '').trim();
        }
        if (address.includes('WE')) {
            specialNotes.push('West End area');
            address = address.replace(/\bWE\b/g, '').trim();
        }
        if (address.includes('PC')) {
            city = 'Panama City';
            address = address.replace(/\bPC\b/g, '').trim();
        }

        // Clean up extra spaces and commas
        address = address.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();

        locations.push({
            area: currentArea,
            address: address,
            city: city,
            state: 'FL',
            zipCode: zipCode,
            fullAddress: `${address}, ${city}, FL${zipCode ? ' ' + zipCode : ''}`,
            isNew: isNew,
            notes: specialNotes.join('; '),
            source: 'Reese R. community data'
        });
    }

    return locations;
}

const parsedLocations = parseData();

console.log(`\n📊 PARSING COMPLETE`);
console.log(`Total locations found: ${parsedLocations.length}`);
console.log(`New locations (✓✓): ${parsedLocations.filter(l => l.isNew).length}`);

// Show breakdown by area
const byArea = {};
parsedLocations.forEach(loc => {
    if (!byArea[loc.area]) byArea[loc.area] = 0;
    byArea[loc.area]++;
});

console.log(`\n📍 BREAKDOWN BY AREA:`);
Object.entries(byArea).sort((a, b) => b[1] - a[1]).forEach(([area, count]) => {
    console.log(`  ${area}: ${count} locations`);
});

// Save to JSON file
const fs = require('fs');
fs.writeFileSync('trapper-locations.json', JSON.stringify(parsedLocations, null, 2));
console.log(`\n✅ Saved to trapper-locations.json`);

// Save to CSV
const csvHeaders = 'area,address,city,state,zipCode,fullAddress,isNew,notes,source\n';
const csvRows = parsedLocations.map(loc => {
    return `"${loc.area}","${loc.address}","${loc.city}","${loc.state}","${loc.zipCode}","${loc.fullAddress}","${loc.isNew}","${loc.notes}","${loc.source}"`;
}).join('\n');
fs.writeFileSync('trapper-locations.csv', csvHeaders + csvRows);
console.log(`✅ Saved to trapper-locations.csv`);

// Show first 5 examples
console.log(`\n📝 FIRST 5 EXAMPLES:`);
parsedLocations.slice(0, 5).forEach((loc, i) => {
    console.log(`\n${i + 1}. ${loc.fullAddress}`);
    console.log(`   Area: ${loc.area}`);
    console.log(`   New: ${loc.isNew ? 'YES ✓✓' : 'No'}`);
    if (loc.notes) console.log(`   Notes: ${loc.notes}`);
});

console.log(`\n🚀 Ready for geocoding!`);
