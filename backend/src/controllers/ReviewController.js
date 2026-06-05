class ReviewController {
  constructor(db) {
    this.db = db;
  }

  // User's own reviews
  async getMyReviews(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const [rows] = await this.db.query(
        `SELECT r.*, m.home_team, m.away_team, m.match_date, s.name as stadium_name
         FROM reviews r
         LEFT JOIN matches m ON r.match_id = m.id
         LEFT JOIN stadiums s ON (r.stadium_id = s.id OR m.stadium_id = s.id)
         WHERE r.user_id = ?
         ORDER BY r.created_at DESC`,
        [userId]
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  // Get reviews for a specific match
  async getMatchReviews(req, res, next) {
    try {
      const [rows] = await this.db.query(
        `SELECT r.*, u.first_name, u.last_name
         FROM reviews r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.match_id = ? AND r.is_approved = 1
         ORDER BY r.created_at DESC`,
        [req.params.matchId]
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  // Create a review (system-wide rating, no match required)
  async createReview(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { rating, comment, stadium_id } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }

      // Check if user already left a system review
      const [existing] = await this.db.query(
        'SELECT id FROM reviews WHERE user_id = ? AND match_id IS NULL AND stadium_id IS NULL',
        [userId]
      );
      if (existing.length > 0) {
        await this.db.query(
          'UPDATE reviews SET rating = ?, comment = ?, is_approved = 0, updated_at = NOW() WHERE id = ?',
          [rating, comment || null, existing[0].id]
        );
        return res.json({ success: true, message: 'Review updated' });
      }

      await this.db.query(
        'INSERT INTO reviews (user_id, rating, comment, is_approved) VALUES (?, ?, ?, 0)',
        [userId, rating, comment || null]
      );
      res.status(201).json({ success: true, message: 'Review submitted for approval' });
    } catch (error) { next(error); }
  }

  // Delete own review
  async deleteReview(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      await this.db.query('DELETE FROM reviews WHERE id = ? AND user_id = ?', [req.params.id, userId]);
      res.json({ success: true, message: 'Review deleted' });
    } catch (error) { next(error); }
  }

  // Admin: get all reviews
  async getAllReviews(req, res, next) {
    try {
      const [rows] = await this.db.query(
        `SELECT r.*, u.first_name, u.last_name, u.email, m.home_team, m.away_team
         FROM reviews r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN matches m ON r.match_id = m.id
         ORDER BY r.created_at DESC`
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  // Admin: approve review
  async approveReview(req, res, next) {
    try {
      await this.db.query('UPDATE reviews SET is_approved = 1 WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Review approved' });
    } catch (error) { next(error); }
  }

  // Admin: delete any review
  async adminDeleteReview(req, res, next) {
    try {
      await this.db.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Review deleted' });
    } catch (error) { next(error); }
  }
}

module.exports = ReviewController;