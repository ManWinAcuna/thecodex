/* ============================================================================
   THE CODEX - starter research fields.
   Names ONLY. Every date is resolved live from Wikidata at preload time -
   never a fabricated or hand-typed date, same doctrine as EMAX's Top 50.
   A name Wikidata can't give a day-precision date for is reported as a
   miss, not guessed.
   ========================================================================== */

const CODEX_SEED_FIELDS = [
  {
    name: 'NBA Legends', kind: 'people',
    list: ['Michael Jordan', 'LeBron James', 'Kareem Abdul-Jabbar', 'Magic Johnson', 'Larry Bird', 'Wilt Chamberlain', 'Bill Russell', "Shaquille O'Neal", 'Tim Duncan', 'Kobe Bryant', 'Stephen Curry', 'Kevin Durant', 'Hakeem Olajuwon', 'Oscar Robertson', 'Jerry West', 'Julius Erving', 'Moses Malone', 'Karl Malone', 'Dirk Nowitzki', 'Giannis Antetokounmpo', 'Nikola Jokić', 'Kevin Garnett', 'Charles Barkley', 'David Robinson', 'Dwyane Wade', 'Allen Iverson', 'Isiah Thomas', 'John Stockton', 'Scottie Pippen', 'Elgin Baylor', 'John Havlicek', 'Rick Barry', 'Bob Pettit', 'Patrick Ewing', 'Steve Nash', 'Jason Kidd', 'Chris Paul', 'James Harden', 'Kawhi Leonard', 'Russell Westbrook', 'Damian Lillard', 'Anthony Davis', 'Luka Dončić', 'Vince Carter', 'Ray Allen', 'Reggie Miller', 'Gary Payton', 'Dominique Wilkins', 'George Gervin', 'Walt Frazier'],
  },
  {
    name: 'UFC Champions', kind: 'people',
    list: ['Jon Jones', 'Anderson Silva', 'Georges St-Pierre', 'Khabib Nurmagomedov', 'Conor McGregor', 'Israel Adesanya', 'Islam Makhachev', 'Alexander Volkanovski', 'Kamaru Usman', 'Stipe Miocic', 'Daniel Cormier', 'Demetrious Johnson', 'José Aldo', 'Max Holloway', 'Charles Oliveira', 'Amanda Nunes', 'Valentina Shevchenko', 'Ronda Rousey', 'Chuck Liddell', 'Randy Couture', 'Matt Hughes', 'B.J. Penn', 'Frankie Edgar', 'Dominick Cruz', 'T.J. Dillashaw', 'Henry Cejudo', 'Francis Ngannou', 'Tom Aspinall', 'Alex Pereira', 'Leon Edwards', "Sean O'Malley", 'Ilia Topuria', 'Robert Whittaker', 'Brock Lesnar', 'Cain Velasquez', 'Junior dos Santos', 'Rich Franklin', 'Lyoto Machida', 'Vitor Belfort', 'Rashad Evans', 'Forrest Griffin', 'Quinton Jackson', 'Michael Bisping', 'Luke Rockhold', 'Chris Weidman', 'Fabrício Werdum', 'Zhang Weili', 'Rose Namajunas', 'Joanna Jędrzejczyk', 'Holly Holm'],
  },
  {
    name: 'Tennis Greats', kind: 'people',
    list: ['Novak Djokovic', 'Rafael Nadal', 'Roger Federer', 'Pete Sampras', 'Andre Agassi', 'Rod Laver', 'Björn Borg', 'John McEnroe', 'Jimmy Connors', 'Ivan Lendl', 'Boris Becker', 'Stefan Edberg', 'Mats Wilander', 'Jim Courier', 'Andy Murray', 'Stan Wawrinka', 'Carlos Alcaraz', 'Jannik Sinner', 'Daniil Medvedev', 'Serena Williams', 'Venus Williams', 'Steffi Graf', 'Martina Navratilova', 'Chris Evert', 'Monica Seles', 'Margaret Court', 'Billie Jean King', 'Justine Henin', 'Kim Clijsters', 'Maria Sharapova', 'Victoria Azarenka', 'Naomi Osaka', 'Iga Świątek', 'Aryna Sabalenka', 'Coco Gauff', 'Ashleigh Barty', 'Angelique Kerber', 'Simona Halep', 'Caroline Wozniacki', 'Garbiñe Muguruza', 'Lindsay Davenport', 'Martina Hingis', 'Gabriela Sabatini', 'Andy Roddick', 'Lleyton Hewitt', 'Marat Safin', 'Juan Martín del Potro', 'Gustavo Kuerten', 'Michael Chang', 'Arthur Ashe'],
  },
  {
    name: 'MLB Legends', kind: 'people',
    list: ['Babe Ruth', 'Willie Mays', 'Hank Aaron', 'Ted Williams', 'Lou Gehrig', 'Ty Cobb', 'Mickey Mantle', 'Barry Bonds', 'Stan Musial', 'Joe DiMaggio', 'Honus Wagner', 'Walter Johnson', 'Cy Young', 'Sandy Koufax', 'Pedro Martínez', 'Greg Maddux', 'Randy Johnson', 'Roger Clemens', 'Nolan Ryan', 'Bob Gibson', 'Tom Seaver', 'Derek Jeter', 'Ken Griffey Jr.', 'Alex Rodriguez', 'Albert Pujols', 'Miguel Cabrera', 'Mike Trout', 'Shohei Ohtani', 'Ichiro Suzuki', 'Cal Ripken Jr.', 'Rickey Henderson', 'Frank Robinson', 'Roberto Clemente', 'Jackie Robinson', 'Yogi Berra', 'Johnny Bench', 'Mike Schmidt', 'George Brett', 'Tony Gwynn', 'Wade Boggs', 'Rod Carew', 'Pete Rose', 'Ozzie Smith', 'Mariano Rivera', 'Clayton Kershaw', 'Justin Verlander', 'Max Scherzer', 'David Ortiz', 'Vladimir Guerrero', 'Chipper Jones'],
  },
  {
    name: 'Billionaires', kind: 'people',
    list: ['Elon Musk', 'Jeff Bezos', 'Bernard Arnault', 'Bill Gates', 'Warren Buffett', 'Larry Ellison', 'Larry Page', 'Sergey Brin', 'Mark Zuckerberg', 'Steve Ballmer', 'Mukesh Ambani', 'Gautam Adani', 'Carlos Slim', 'Amancio Ortega', 'Françoise Bettencourt Meyers', 'Michael Bloomberg', 'Michael Dell', 'Jensen Huang', 'Jim Walton', 'Rob Walton', 'Alice Walton', 'Charles Koch', 'Phil Knight', 'MacKenzie Scott', 'Giovanni Ferrero', 'François Pinault', 'Zhong Shanshan', 'Ma Huateng', 'Jack Ma', 'Masayoshi Son', 'Tadashi Yanai', 'Dieter Schwarz', 'Len Blavatnik', 'Stephen Schwarzman', 'Ken Griffin', 'Ray Dalio', 'George Soros', 'Sam Walton', 'John D. Rockefeller', 'Andrew Carnegie', 'Henry Ford', 'Howard Hughes', 'J. Paul Getty', 'Aristotle Onassis', 'Cornelius Vanderbilt', 'Rupert Murdoch', 'Richard Branson', 'Oprah Winfrey', 'Prince Al-Waleed bin Talal', 'Li Ka-shing'],
  },
  {
    name: 'Founder CEOs', kind: 'people',
    list: ['Steve Jobs', 'Steve Wozniak', 'Jack Dorsey', 'Evan Spiegel', 'Brian Chesky', 'Travis Kalanick', 'Reed Hastings', 'Marc Benioff', 'Sam Altman', 'Patrick Collison', 'John Collison', 'Daniel Ek', 'Drew Houston', 'Jan Koum', 'Kevin Systrom', 'Palmer Luckey', 'Walt Disney', 'Thomas Edison', 'Estée Lauder', 'Coco Chanel', 'Ray Kroc', 'Howard Schultz', 'Ingvar Kamprad', 'Enzo Ferrari', 'Ferruccio Lamborghini', 'Soichiro Honda', 'Akio Morita', 'Konosuke Matsushita', 'Ted Turner', 'Vince McMahon', 'Dana White', 'Bernard Arnault', 'Ralph Lauren', 'Giorgio Armani', 'Gianni Versace', 'Yvon Chouinard', 'James Dyson', 'Willis Carrier', 'Milton Hershey', 'W. K. Kellogg'],
  },
  {
    name: 'US Presidents', kind: 'people',
    list: ['George Washington', 'John Adams', 'Thomas Jefferson', 'James Madison', 'James Monroe', 'John Quincy Adams', 'Andrew Jackson', 'Martin Van Buren', 'William Henry Harrison', 'John Tyler', 'James K. Polk', 'Zachary Taylor', 'Millard Fillmore', 'Franklin Pierce', 'James Buchanan', 'Abraham Lincoln', 'Andrew Johnson', 'Ulysses S. Grant', 'Rutherford B. Hayes', 'James A. Garfield', 'Chester A. Arthur', 'Grover Cleveland', 'Benjamin Harrison', 'William McKinley', 'Theodore Roosevelt', 'William Howard Taft', 'Woodrow Wilson', 'Warren G. Harding', 'Calvin Coolidge', 'Herbert Hoover', 'Franklin D. Roosevelt', 'Harry S. Truman', 'Dwight D. Eisenhower', 'John F. Kennedy', 'Lyndon B. Johnson', 'Richard Nixon', 'Gerald Ford', 'Jimmy Carter', 'Ronald Reagan', 'George H. W. Bush', 'Bill Clinton', 'George W. Bush', 'Barack Obama', 'Donald Trump', 'Joe Biden'],
  },
  {
    name: 'Music Icons', kind: 'people',
    list: ['Michael Jackson', 'Elvis Presley', 'Madonna', 'Prince', 'David Bowie', 'Freddie Mercury', 'John Lennon', 'Paul McCartney', 'Bob Dylan', 'Jimi Hendrix', 'Stevie Wonder', 'Aretha Franklin', 'Whitney Houston', 'Mariah Carey', 'Beyoncé', 'Rihanna', 'Taylor Swift', 'Adele', 'Lady Gaga', 'Bruno Mars', 'Drake', 'Kanye West', 'Jay-Z', 'Eminem', 'Tupac Shakur', 'The Notorious B.I.G.', 'Snoop Dogg', 'Kendrick Lamar', 'Bad Bunny', 'Justin Bieber', 'Ariana Grande', 'Billie Eilish', 'The Weeknd', 'Ed Sheeran', 'Elton John', 'Rod Stewart', 'Bruce Springsteen', 'Mick Jagger', 'Kurt Cobain', 'Bob Marley', 'Frank Sinatra', 'Ray Charles', 'James Brown', 'Chuck Berry', 'Little Richard', 'Johnny Cash', 'Dolly Parton', 'Celine Dion', 'Shakira', 'Britney Spears'],
  },
  {
    name: 'Hollywood Actors', kind: 'people',
    list: ['Tom Cruise', 'Leonardo DiCaprio', 'Brad Pitt', 'Johnny Depp', 'Robert De Niro', 'Al Pacino', 'Jack Nicholson', 'Marlon Brando', 'Denzel Washington', 'Morgan Freeman', 'Samuel L. Jackson', 'Will Smith', 'Tom Hanks', 'Harrison Ford', 'Keanu Reeves', 'Dwayne Johnson', 'Arnold Schwarzenegger', 'Sylvester Stallone', 'Bruce Willis', 'Clint Eastwood', 'Anthony Hopkins', 'Daniel Day-Lewis', 'Christian Bale', 'Matt Damon', 'Ben Affleck', 'George Clooney', 'Ryan Gosling', 'Ryan Reynolds', 'Chris Hemsworth', 'Robert Downey Jr.', 'Chris Evans', 'Scarlett Johansson', 'Meryl Streep', 'Julia Roberts', 'Angelina Jolie', 'Jennifer Lawrence', 'Charlize Theron', 'Nicole Kidman', 'Cate Blanchett', 'Natalie Portman', 'Emma Stone', 'Anne Hathaway', 'Sandra Bullock', 'Margot Robbie', 'Zendaya', 'Timothée Chalamet', 'Joaquin Phoenix', 'Heath Ledger', 'Audrey Hepburn', 'Marilyn Monroe'],
  },
  {
    name: 'Directors', kind: 'people',
    list: ['Steven Spielberg', 'Martin Scorsese', 'Quentin Tarantino', 'Christopher Nolan', 'Alfred Hitchcock', 'Stanley Kubrick', 'Francis Ford Coppola', 'Ridley Scott', 'James Cameron', 'George Lucas', 'Peter Jackson', 'David Fincher', 'Denis Villeneuve', 'Tim Burton', 'Wes Anderson', 'Paul Thomas Anderson', 'Joel Coen', 'Ethan Coen', 'Akira Kurosawa', 'Hayao Miyazaki', 'Bong Joon-ho', 'Park Chan-wook', 'Guillermo del Toro', 'Alejandro González Iñárritu', 'Alfonso Cuarón', 'Spike Lee', 'Jordan Peele', 'Greta Gerwig', 'Sofia Coppola', 'Kathryn Bigelow', 'Oliver Stone', 'Michael Bay', 'Zack Snyder', 'John Carpenter', 'Wes Craven', 'Sergio Leone', 'Ingmar Bergman', 'Federico Fellini', 'Billy Wilder', 'Orson Welles'],
  },
];
