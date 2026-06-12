const FootballApiService = require('./FootballApiService');

class FootballSyncService {
  constructor(sequelize) {
    this.footballApi = new FootballApiService();
    this.sequelize = sequelize;
    this.Match = sequelize.models.Match;
  }

  /**
   * Sync upcoming matches from API-Football into the local MySQL database
   * This enriches the local DB with real fixture data
   */
  async syncUpcomingMatches() {
    if (!this.footballApi.isConfigured()) {
      console.warn('⚠️ FootballSyncService: API key not configured. Skipping sync.');
      return { synced: 0, message: 'API key not configured' };
    }

    try {
      const apiMatches = await this.footballApi.getAllUpcomingMatches(50);
      let syncedCount = 0;

      for (const apiMatch of apiMatches) {
        try {
          // Check if match already exists by external ID (store in a custom field)
          // We use competition field as a way to identify external matches
          const existing = await this.Match.findOne({
            where: {
              homeTeam: apiMatch.homeTeam.name,
              awayTeam: apiMatch.awayTeam.name,
              matchDate: apiMatch.date ? apiMatch.date.split('T')[0] : null
            }
          });

          if (existing) {
            // Update existing match with latest API data if live
            if (apiMatch.status === 'LIVE') {
              const homeScore = apiMatch.goals?.home ?? existing.homeScore;
              const awayScore = apiMatch.goals?.away ?? existing.awayScore;
              await existing.update({
                status: 'live',
                homeScore,
                awayScore
              });
            }
            continue;
          }

          // Find a default stadium (use the first one, or skip if none exist)
          const stadiums = await this.sequelize.models.Stadium.findAll({ limit: 1 });
          if (stadiums.length === 0) {
            console.warn('⚠️ No stadiums found in DB. Skipping API match sync.');
            continue;
          }

          const matchDate = apiMatch.date ? apiMatch.date.split('T')[0] : new Date().toISOString().split('T')[0];
          const matchTime = apiMatch.date ? new Date(apiMatch.date).toTimeString().split(' ')[0].slice(0, 5) : '20:00';

          const createdMatch = await this.Match.create({
            homeTeam: apiMatch.homeTeam.name,
            awayTeam: apiMatch.awayTeam.name,
            stadiumId: stadiums[0].id,
            matchDate,
            matchTime: `${matchTime}:00`,
            competition: apiMatch.league?.name || 'International Match',
            round: apiMatch.statusLong || 'Scheduled',
            basePrice: 25.00,
            status: apiMatch.status === 'LIVE' ? 'live' : 'scheduled',
            homeScore: apiMatch.goals?.home ?? 0,
            awayScore: apiMatch.goals?.away ?? 0,
            createdBy: 1,
            updatedBy: 1
          });

          // ── Auto-generate tickets for the newly created match ──
          try {
            const sequelize = this.sequelize;
            const [sections] = await sequelize.query(
              'SELECT id, name, row_count, seats_per_row, price_multiplier FROM sections WHERE stadium_id = ?',
              { replacements: [stadiums[0].id] }
            );

            // If no sections exist, create 6 default sections (33 seats each = 198 tickets)
            let sectionsToUse = sections;
            if (sectionsToUse.length === 0) {
              const sectionDefs = [
                { name: 'North Stand', rows: 3, seatsPerRow: 11, multiplier: 1.0 },
                { name: 'South Stand', rows: 3, seatsPerRow: 11, multiplier: 1.0 },
                { name: 'East Stand', rows: 3, seatsPerRow: 11, multiplier: 1.0 },
                { name: 'West Stand', rows: 3, seatsPerRow: 11, multiplier: 1.0 },
                { name: 'VIP North', rows: 3, seatsPerRow: 11, multiplier: 2.0 },
                { name: 'VIP South', rows: 3, seatsPerRow: 11, multiplier: 2.0 },
              ];
              for (const def of sectionDefs) {
                const [res] = await sequelize.query(
                  `INSERT INTO sections (stadium_id, name, row_count, seats_per_row, price_multiplier, description, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                  { replacements: [stadiums[0].id, def.name, def.rows, def.seatsPerRow, def.multiplier, `Auto-generated: ${def.name}`] }
                );
                sectionsToUse.push({ id: res.insertId, name: def.name, row_count: def.rows, seats_per_row: def.seatsPerRow, price_multiplier: def.multiplier });
              }
            }

            const matchId = createdMatch.id;
            const basePrice = 25.00;
            let ticketsInserted = 0;

            for (const section of sectionsToUse) {
              const totalSeats = section.row_count * section.seats_per_row;
              const isVip = section.name.toLowerCase().includes('vip');
              const price = isVip
                ? Math.min(150, Math.round(basePrice * section.price_multiplier * 100) / 100)
                : Math.round(basePrice * section.price_multiplier * 100) / 100;

              const tickets = [];
              for (let seatIdx = 1; seatIdx <= totalSeats; seatIdx++) {
                const rowNumber  = Math.ceil(seatIdx / section.seats_per_row);
                const seatNumber = ((seatIdx - 1) % section.seats_per_row) + 1;
                tickets.push([matchId, section.id, rowNumber, seatNumber, price, 'available']);
              }

              for (let i = 0; i < tickets.length; i += 500) {
                const chunk = tickets.slice(i, i + 500);
                const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
                await sequelize.query(
                  `INSERT INTO tickets (\`match_id\`, \`section_id\`, \`row_number\`, \`seat_number\`, \`price\`, \`status\`) VALUES ${placeholders}`,
                  { replacements: chunk.flat() }
                );
                ticketsInserted += chunk.length;
              }
            }

            console.log(`   🎫 Generated ${ticketsInserted} tickets for match #${matchId}`);
          } catch (ticketErr) {
            console.error(`   ⚠️ Could not auto-generate tickets for match: ${ticketErr.message}`);
          }

          syncedCount++;
        } catch (matchError) {
          console.error(`❌ Error syncing match ${apiMatch.homeTeam?.name} vs ${apiMatch.awayTeam?.name}:`, matchError.message);
        }
      }

      console.log(`✅ Football sync complete: ${syncedCount} new matches imported`);
      return { synced: syncedCount, total: apiMatches.length };
    } catch (error) {
      console.error('❌ Football sync error:', error.message);
      return { synced: 0, message: error.message };
    }
  }
}

module.exports = FootballSyncService;