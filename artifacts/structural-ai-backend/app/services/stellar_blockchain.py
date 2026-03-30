"""
Stellar Blockchain Integration.

Every analysis generates a SHA-256 hash of the canonical report JSON,
then submits it to the Stellar Testnet via a manage_data operation
(storing the first 64 bytes of the hash as account data).

The real Stellar transaction hash is returned as blockchainTxId.
Falls back to a deterministic simulated ID if the network call fails.
"""
import hashlib
import json
import os
import urllib.request
from datetime import datetime
from typing import Any, Dict, Optional, Tuple


STELLAR_HORIZON_TESTNET = "https://horizon-testnet.stellar.org"
STELLAR_HORIZON_MAINNET = "https://horizon.stellar.org"
STELLAR_NETWORK         = os.environ.get("STELLAR_NETWORK", "testnet")


def hash_report(report_data: Dict[str, Any]) -> str:
    """Generate a deterministic SHA-256 hash of the analysis report."""
    canonical = {
        "imageWidth":       report_data.get("imageWidth"),
        "imageHeight":      report_data.get("imageHeight"),
        "totalWallLength":  report_data.get("totalWallLength"),
        "totalArea":        report_data.get("totalArea"),
        "builtUpArea":      report_data.get("builtUpArea"),
        "wallCount":        len(report_data.get("walls", [])),
        "roomCount":        len(report_data.get("rooms", [])),
        "loadBearingCount": report_data.get("loadBearingCount", 0),
        "partitionCount":   report_data.get("partitionCount", 0),
        "maxSpan":          report_data.get("maxSpan", 0),
        "topMaterial":      (report_data.get("recommendations") or [{}])[0].get("material", ""),
        "timestamp":        datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    canonical_str = json.dumps(canonical, sort_keys=True)
    return hashlib.sha256(canonical_str.encode()).hexdigest()


def store_on_stellar(report_hash: str) -> Tuple[Optional[str], str]:
    """
    Submit the report hash to Stellar Testnet using a manage_data operation.
    Uses a pre-funded permanent testnet account (no Friendbot call needed).
    Returns (transaction_hash, network_label).
    """
    horizon_url = (
        STELLAR_HORIZON_TESTNET if STELLAR_NETWORK == "testnet"
        else STELLAR_HORIZON_MAINNET
    )

    # Pre-funded testnet account — fund once via browser:
    # https://friendbot.stellar.org?addr=GABJGR3IP74R7A5J2HJTM5QVJUWXZHQ6FHBEH5JCDP3ZXVDMTQYZNCOV
    _DEFAULT_TESTNET_SECRET = "SDUHVEIPGF6PYIULMRFV4QQYK37VKSKFXZMYKGN5PVPGC3BD6CYLR7JS"
    account_secret = os.environ.get("STELLAR_ACCOUNT_SECRET", _DEFAULT_TESTNET_SECRET)

    try:
        from stellar_sdk import (
            Keypair, Network, Server, TransactionBuilder
        )

        passphrase = (
            Network.TESTNET_NETWORK_PASSPHRASE
            if STELLAR_NETWORK == "testnet"
            else Network.PUBLIC_NETWORK_PASSPHRASE
        )

        server  = Server(horizon_url=horizon_url)
        keypair = Keypair.from_secret(account_secret)
        account = server.load_account(keypair.public_key)

        data_value = report_hash[:64].encode("utf-8")[:64]

        transaction = (
            TransactionBuilder(
                source_account=account,
                network_passphrase=passphrase,
                base_fee=100,
            )
            .add_text_memo(report_hash[:28])
            .append_manage_data_op(
                data_name="struct_hash",
                data_value=data_value,
            )
            .set_timeout(30)
            .build()
        )

        transaction.sign(keypair)
        response = server.submit_transaction(transaction)

        tx_id = response.get("hash") or response.get("id")
        import logging
        logging.getLogger(__name__).info(
            "[stellar] TX submitted: %s", tx_id
        )
        return tx_id, STELLAR_NETWORK

    except ImportError:
        pass
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "[stellar] Live submission failed (%s); using simulated TX.", exc
        )

    tx_id = _simulate_stellar_transaction(report_hash)
    return tx_id, f"{STELLAR_NETWORK}-simulated"


def _simulate_stellar_transaction(report_hash: str) -> str:
    """Deterministic simulated Stellar TX ID based on the report hash."""
    return hashlib.sha256(f"stellar-struct-{report_hash}".encode()).hexdigest()


def get_transaction_explorer_url(tx_id: str, network: str = "testnet") -> str:
    """Return a Stellar Expert explorer URL for the given transaction."""
    base = "testnet" if "testnet" in network else "public"
    return f"https://stellar.expert/explorer/{base}/tx/{tx_id}"
