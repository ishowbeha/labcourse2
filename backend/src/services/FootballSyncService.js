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

          await this.Match.create({
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