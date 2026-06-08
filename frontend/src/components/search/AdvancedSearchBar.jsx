import React, { useState, useCallback } from 'react';
import { Form, Button, Badge, Collapse, Row, Col, InputGroup } from 'react-bootstrap';

/**
 * AdvancedSearchBar — A reusable advanced search component.
 *
 * Props:
 *  searchValue       string            Current text search value
 *  onSearchChange    fn(value)         Called when text input changes
 *  onSearch          fn()              Called when user submits search
 *  onReset           fn()              Called when user resets all filters
 *  placeholder       string            Placeholder for main text input
 *
 *  filters           FilterDef[]       Array of filter definitions
 *  filterValues      object            Current filter values { [fieldId]: value }
 *  onFilterChange    fn(id, value)     Called when a filter changes
 *
 *  sortOptions       SortOption[]      Array of sort options { value, label }
 *  sortValue         string            Current sort field value
 *  sortDir           'asc'|'desc'      Current sort direction
 *  onSortChange      fn(field, dir)    Called when sort changes
 *
 *  resultCount       number|null       Optional result count to display
 *  totalCount        number|null       Optional total count (before filter)
 *
 * FilterDef shape:
 *  { id, label, type: 'select'|'date'|'number'|'text', options?: [{value, label}], placeholder? }
 */
const AdvancedSearchBar = ({
  searchValue = '',
  onSearchChange,
  onSearch,
  onReset,
  placeholder = 'Search...',
  filters = [],
  filterValues = {},
  onFilterChange,
  sortOptions = [],
  sortValue = '',
  sortDir = 'asc',
  onSortChange,
  resultCount = null,
  totalCount = null,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (onSearch) onSearch();
    }
  };

  // Compute active filters (non-empty values)
  const activeFilters = filters.filter((f) => {
    const val = filterValues[f.id];
    return val !== undefined && val !== '' && val !== null;
  });

  const hasActiveSearch = searchValue && searchValue.trim().length > 0;
  const totalActive = activeFilters.length + (hasActiveSearch ? 1 : 0);

  const renderFilterField = (filter) => {
    const value = filterValues[filter.id] ?? '';

    if (filter.type === 'select') {
      return (
        <Form.Select
          id={`filter-${filter.id}`}
          size="sm"
          value={value}
          onChange={(e) => onFilterChange && onFilterChange(filter.id, e.target.value)}
        >
          <option value="">{filter.placeholder || `All ${filter.label}`}</option>
          {(filter.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Form.Select>
      );
    }

    if (filter.type === 'date') {
      return (
        <Form.Control
          id={`filter-${filter.id}`}
          type="date"
          size="sm"
          value={value}
          onChange={(e) => onFilterChange && onFilterChange(filter.id, e.target.value)}
          placeholder={filter.placeholder}
        />
      );
    }

    if (filter.type === 'number') {
      return (
        <Form.Control
          id={`filter-${filter.id}`}
          type="number"
          size="sm"
          value={value}
          min={filter.min}
          max={filter.max}
          step={filter.step || 1}
          onChange={(e) => onFilterChange && onFilterChange(filter.id, e.target.value)}
          placeholder={filter.placeholder}
        />
      );
    }

    // Default: text
    return (
      <Form.Control
        id={`filter-${filter.id}`}
        type="text"
        size="sm"
        value={value}
        onChange={(e) => onFilterChange && onFilterChange(filter.id, e.target.value)}
        placeholder={filter.placeholder}
        onKeyDown={handleKeyDown}
      />
    );
  };

  return (
    <div className="advanced-search-bar" style={{ marginBottom: '1rem' }}>
      {/* ── Main Search Row ─────────────────────────────────────── */}
      <Form onSubmit={handleSubmit}>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {/* Text Search */}
          <div className="flex-grow-1" style={{ minWidth: 220 }}>
            <InputGroup>
              <InputGroup.Text style={{ background: '#f8fafc', border: '1.5px solid #d0d7e3' }}>
                🔍
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder={placeholder}
                value={searchValue}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ border: '1.5px solid #d0d7e3', borderLeft: 'none' }}
              />
            </InputGroup>
          </div>

          {/* Sort Controls */}
          {sortOptions.length > 0 && (
            <div className="d-flex gap-1 align-items-center">
              <Form.Select
                size="sm"
                value={sortValue}
                onChange={(e) => onSortChange && onSortChange(e.target.value, sortDir)}
                style={{ minWidth: 140, border: '1.5px solid #d0d7e3' }}
                id="sort-field-select"
              >
                <option value="">Sort by...</option>
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Form.Select>
              <Button
                variant="outline-secondary"
                size="sm"
                title={sortDir === 'asc' ? 'Ascending — click for Descending' : 'Descending — click for Ascending'}
                onClick={() => onSortChange && onSortChange(sortValue, sortDir === 'asc' ? 'desc' : 'asc')}
                style={{ minWidth: 36 }}
              >
                {sortDir === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          )}

          {/* Advanced toggle */}
          {filters.length > 0 && (
            <Button
              variant={showAdvanced ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setShowAdvanced((v) => !v)}
              style={{ whiteSpace: 'nowrap' }}
              id="toggle-advanced-filters"
            >
              {showAdvanced ? '▲ Filters' : '▼ Filters'}
              {totalActive > 0 && (
                <Badge bg="danger" className="ms-1" pill>
                  {totalActive}
                </Badge>
              )}
            </Button>
          )}

          {/* Search Button */}
          <Button type="submit" variant="primary" size="sm" id="search-submit-btn">
            Search
          </Button>

          {/* Reset */}
          {(totalActive > 0) && (
            <Button
              type="button"
              variant="outline-danger"
              size="sm"
              onClick={onReset}
              id="search-reset-btn"
            >
              ✕ Reset
            </Button>
          )}
        </div>

        {/* ── Advanced Filters Panel ─────────────────────────────── */}
        <Collapse in={showAdvanced}>
          <div>
            <div
              className="mt-3 p-3 rounded-3"
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)',
                border: '1.5px solid #d0d7e3',
              }}
            >
              <div className="small fw-semibold text-secondary mb-2" style={{ letterSpacing: '0.05em' }}>
                ADVANCED FILTERS
              </div>
              <Row className="g-2">
                {filters.map((filter) => (
                  <Col key={filter.id} xs={12} sm={6} md={4} lg={3}>
                    <Form.Group controlId={`filter-${filter.id}`}>
                      <Form.Label className="small text-muted mb-1">{filter.label}</Form.Label>
                      {renderFilterField(filter)}
                    </Form.Group>
                  </Col>
                ))}
              </Row>
              <div className="d-flex gap-2 mt-3">
                <Button type="submit" variant="primary" size="sm">
                  Apply Filters
                </Button>
                <Button type="button" variant="outline-secondary" size="sm" onClick={onReset}>
                  Reset All
                </Button>
              </div>
            </div>
          </div>
        </Collapse>
      </Form>

      {/* ── Active Filter Chips & Result Count ────────────────────── */}
      {(activeFilters.length > 0 || resultCount !== null) && (
        <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
          {activeFilters.map((f) => {
            const val = filterValues[f.id];
            let displayVal = val;
            if (f.type === 'select' && f.options) {
              const opt = f.options.find((o) => String(o.value) === String(val));
              if (opt) displayVal = opt.label;
            }
            return (
              <Badge
                key={f.id}
                pill
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  fontWeight: 500,
                  fontSize: 11,
                  padding: '4px 10px',
                  cursor: 'pointer',
                }}
                onClick={() => onFilterChange && onFilterChange(f.id, '')}
                title={`Remove filter: ${f.label}`}
              >
                {f.label}: {displayVal} ✕
              </Badge>
            );
          })}

          {resultCount !== null && (
            <span className="text-muted small ms-auto">
              {resultCount}
              {totalCount !== null && totalCount !== resultCount ? ` / ${totalCount}` : ''} result
              {resultCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchBar;
