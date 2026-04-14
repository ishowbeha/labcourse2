// Stadium model - defines the structure for stadium data
class Stadium {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.city = data.city;
    this.country = data.country;
    this.capacity = data.capacity;
    this.address = data.address;
    this.imageUrl = data.image_url;
    this.description = data.description;
    this.isActive = data.is_active;
    this.createdBy = data.created_by;
    this.updatedBy = data.updated_by;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Get stadium full address
  getFullAddress() {
    return `${this.address}, ${this.city}, ${this.country}`;
  }

  // Check if stadium is active
  isActive() {
    return this.isActive === 1;
  }
}

// Section model - defines the structure for section data
class Section {
  constructor(data) {
    this.id = data.id;
    this.stadiumId = data.stadium_id;
    this.name = data.name;
    this.rowCount = data.row_count;
    this.seatsPerRow = data.seats_per_row;
    this.priceMultiplier = data.price_multiplier;
    this.description = data.description;
    this.createdBy = data.created_by;
    this.updatedBy = data.updated_by;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Get total seats in section
  getTotalSeats() {
    return this.rowCount * this.seatsPerRow;
  }
}

module.exports = { Stadium, Section };