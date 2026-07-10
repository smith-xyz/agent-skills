package errors

import (
	"errors"
	"fmt"
)

// Sentinel errors for common cases
var (
	ErrNotFound     = errors.New("not found")
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrConflict     = errors.New("conflict")
	ErrInternal     = errors.New("internal error")
)

// AppError wraps an error with additional context
type AppError struct {
	Op   string // Operation that failed
	Kind error  // Category of error
	Err  error  // Underlying error
}

func (e *AppError) Error() string {
	if e.Err == nil {
		return fmt.Sprintf("%s: %v", e.Op, e.Kind)
	}
	return fmt.Sprintf("%s: %v: %v", e.Op, e.Kind, e.Err)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func (e *AppError) Is(target error) bool {
	return errors.Is(e.Kind, target)
}

// E creates an AppError
func E(op string, kind error, err error) error {
	return &AppError{Op: op, Kind: kind, Err: err}
}

// Example usage:
// return errors.E("user.FindByID", errors.ErrNotFound, nil)
// return errors.E("user.Save", errors.ErrInternal, err)
