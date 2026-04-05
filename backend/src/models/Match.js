// Match model - defines the structure for match data
class Match {
  constructor(data) {
    this.id = data.id;
    this.homeTeam = data.home_team;
    this.awayTeam = data.away_team;
    this.stadiumId = data.stadium_id;
    this.matchDate = data.match_date;
    this.matchTime = data.match_time;
    this.competition = data.competition;
    this.round = data.round;
    this.status = data.status;
    this.homeScore = data.home_score;
    this.awayScore = data.away_score;
    this.basePrice = data.base_price;
    this.maxTicketsPerUser = data.max_tickets_per_user;
    this.saleStartDate = data.sale_start_date;
    this.saleEndDate = data.sale_end_date;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Get available tickets count for this match
  getAvailableTickets() {
    // This would query the tickets table
    return 0;
  }

  // Check if match is in the future
  isUpcoming() {
    const matchDateTime = new Date(`${this.matchDate}T${this.matchTime}`);
    return matchDateTime > new Date();
  }

  // Get match datetime as ISO string
  getDateTimeISO() {
    return `${this.matchDate}T${this.matchTime}`;
  }
}

module.exports = Match;