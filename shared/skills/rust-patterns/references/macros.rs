// Declarative macro for creating enum with string conversion
#[macro_export]
macro_rules! string_enum {
    ($name:ident { $($variant:ident => $str:expr),* $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        pub enum $name {
            $($variant),*
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                match self {
                    $(Self::$variant => write!(f, $str)),*
                }
            }
        }

        impl std::str::FromStr for $name {
            type Err = String;
            fn from_str(s: &str) -> Result<Self, Self::Err> {
                match s {
                    $($str => Ok(Self::$variant)),*,
                    _ => Err(format!("unknown {}: {}", stringify!($name), s))
                }
            }
        }
    };
}

// Usage:
// string_enum!(Status { Active => "active", Inactive => "inactive" });

// Declarative macro for builder fields
#[macro_export]
macro_rules! builder_fields {
    ($builder:ident { $($field:ident: $type:ty),* $(,)? }) => {
        impl $builder {
            $(
                pub fn $field(mut self, value: impl Into<$type>) -> Self {
                    self.$field = Some(value.into());
                    self
                }
            )*
        }
    };
}

// Declarative macro for implementing From for newtype wrappers
#[macro_export]
macro_rules! newtype {
    ($name:ident($inner:ty)) => {
        #[derive(Debug, Clone, PartialEq, Eq, Hash)]
        pub struct $name($inner);

        impl From<$inner> for $name {
            fn from(v: $inner) -> Self {
                Self(v)
            }
        }

        impl AsRef<$inner> for $name {
            fn as_ref(&self) -> &$inner {
                &self.0
            }
        }

        impl std::ops::Deref for $name {
            type Target = $inner;
            fn deref(&self) -> &Self::Target {
                &self.0
            }
        }
    };
}

// Usage:
// newtype!(UserId(String));
// newtype!(OrderId(u64));

// Macro for creating test cases
#[macro_export]
macro_rules! test_cases {
    ($name:ident, $fn:expr, [ $(($input:expr, $expected:expr)),* $(,)? ]) => {
        #[test]
        fn $name() {
            let cases = [$(($input, $expected)),*];
            for (input, expected) in cases {
                let result = $fn(input);
                assert_eq!(result, expected, "failed for input: {:?}", input);
            }
        }
    };
}

// Usage:
// test_cases!(test_parse, parse, [("1", 1), ("2", 2), ("10", 10)]);

// Macro for conditional compilation based on feature flags
#[macro_export]
macro_rules! feature_gate {
    ($feature:literal, $($item:item)*) => {
        $(
            #[cfg(feature = $feature)]
            $item
        )*
    };
}

// When to use macros vs other patterns:
//
// USE MACROS WHEN:
// - Reducing repetitive boilerplate (derive-like patterns)
// - Compile-time code generation
// - DSL creation (test frameworks, builders)
// - Variadic functions (println!-style)
//
// AVOID MACROS WHEN:
// - Generics or traits can solve the problem
// - Runtime polymorphism is acceptable
// - Code clarity is more important than brevity
// - Debugging is a priority (macros are harder to debug)
