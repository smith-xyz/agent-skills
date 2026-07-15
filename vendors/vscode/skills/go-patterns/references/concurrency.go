package concurrency

import (
	"context"
	"sync"
)

type Job[T any] struct {
	ID   string
	Data T
}

type Result[T any] struct {
	ID    string
	Value T
	Err   error
}

type Pool[I, O any] struct {
	jobs    chan Job[I]
	results chan Result[O]
	wg      sync.WaitGroup
	process func(context.Context, I) (O, error)
}

func NewPool[I, O any](
	ctx context.Context,
	workers int,
	bufferSize int,
	processFn func(context.Context, I) (O, error),
) *Pool[I, O] {
	p := &Pool[I, O]{
		jobs:    make(chan Job[I], bufferSize),
		results: make(chan Result[O], bufferSize),
		process: processFn,
	}

	for i := 0; i < workers; i++ {
		p.wg.Add(1)
		go p.worker(ctx)
	}

	return p
}

func (p *Pool[I, O]) worker(ctx context.Context) {
	defer p.wg.Done()
	for {
		select {
		case <-ctx.Done():
			return
		case job, ok := <-p.jobs:
			if !ok {
				return
			}
			value, err := p.process(ctx, job.Data)
			select {
			case <-ctx.Done():
				return
			case p.results <- Result[O]{ID: job.ID, Value: value, Err: err}:
			}
		}
	}
}

func (p *Pool[I, O]) Submit(job Job[I]) {
	p.jobs <- job
}

func (p *Pool[I, O]) Results() <-chan Result[O] {
	return p.results
}

func (p *Pool[I, O]) Close() {
	close(p.jobs)
	p.wg.Wait()
	close(p.results)
}

func FanOut[I, O any](
	ctx context.Context,
	input <-chan I,
	workers int,
	fn func(context.Context, I) O,
) <-chan O {
	output := make(chan O)
	var wg sync.WaitGroup

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case item, ok := <-input:
					if !ok {
						return
					}
					select {
					case <-ctx.Done():
						return
					case output <- fn(ctx, item):
					}
				}
			}
		}()
	}

	go func() {
		wg.Wait()
		close(output)
	}()

	return output
}

func Merge[T any](ctx context.Context, channels ...<-chan T) <-chan T {
	out := make(chan T)
	var wg sync.WaitGroup

	for _, ch := range channels {
		wg.Add(1)
		go func(c <-chan T) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case v, ok := <-c:
					if !ok {
						return
					}
					select {
					case <-ctx.Done():
						return
					case out <- v:
					}
				}
			}
		}(ch)
	}

	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}

func Generate[T any](ctx context.Context, items ...T) <-chan T {
	out := make(chan T)
	go func() {
		defer close(out)
		for _, item := range items {
			select {
			case <-ctx.Done():
				return
			case out <- item:
			}
		}
	}()
	return out
}

type Semaphore struct {
	ch chan struct{}
}

func NewSemaphore(limit int) *Semaphore {
	return &Semaphore{ch: make(chan struct{}, limit)}
}

func (s *Semaphore) Acquire(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case s.ch <- struct{}{}:
		return nil
	}
}

func (s *Semaphore) Release() {
	<-s.ch
}
