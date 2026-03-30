#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, String, Symbol};

// Storage key for hash entries
#[contracttype]
pub enum DataKey {
    Hash(u64),
    Count,
}

#[contract]
pub struct HashAnchorContract;

#[contractimpl]
impl HashAnchorContract {
    /// Store a SHA-256 report hash on-chain.
    /// Returns the record ID assigned to this entry.
    pub fn store_hash(env: Env, report_hash: String) -> u64 {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::Count)
            .unwrap_or(0u64);
        let new_id = count + 1;

        env.storage()
            .persistent()
            .set(&DataKey::Hash(new_id), &report_hash);

        env.storage()
            .instance()
            .set(&DataKey::Count, &new_id);

        // Emit an event so the frontend can pick it up
        env.events().publish(
            (symbol_short!("hash_set"), new_id),
            report_hash,
        );

        new_id
    }

    /// Retrieve a previously stored hash by its record ID.
    pub fn get_hash(env: Env, id: u64) -> Option<String> {
        env.storage()
            .persistent()
            .get(&DataKey::Hash(id))
    }

    /// Total number of hashes stored.
    pub fn get_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::Count)
            .unwrap_or(0u64)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Env as _, Env, String};

    #[test]
    fn test_store_and_retrieve() {
        let env = Env::default();
        let contract_id = env.register_contract(None, HashAnchorContract);
        let client = HashAnchorContractClient::new(&env, &contract_id);

        let hash = String::from_str(&env, "abc123def456abc123def456abc123def456abc123def456abc123def456ab12");
        let id = client.store_hash(&hash);
        assert_eq!(id, 1u64);
        assert_eq!(client.get_hash(&id), Some(hash));
        assert_eq!(client.get_count(), 1u64);
    }

    #[test]
    fn test_multiple_hashes() {
        let env = Env::default();
        let contract_id = env.register_contract(None, HashAnchorContract);
        let client = HashAnchorContractClient::new(&env, &contract_id);

        let h1 = String::from_str(&env, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1111");
        let h2 = String::from_str(&env, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb2222");

        let id1 = client.store_hash(&h1);
        let id2 = client.store_hash(&h2);

        assert_eq!(id1, 1u64);
        assert_eq!(id2, 2u64);
        assert_eq!(client.get_count(), 2u64);
    }
}
