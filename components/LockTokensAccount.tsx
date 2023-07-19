import { BN } from "@coral-xyz/anchor";
import { useAssociatedTokenAccount, useMint } from "@helium/helium-react-hooks";
import { humanReadable, toBN, toNumber } from "@helium/spl-utils";
import {
  calcLockupMultiplier,
  getRegistrarKey,
  useClaimAllPositionsRewards,
  useCreatePosition,
  useHeliumVsrState,
  useRegistrar,
  useSubDaos,
} from "@helium/voter-stake-registry-hooks";
import { useWallet } from "@solana/wallet-adapter-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AiFillLock } from "react-icons/ai";
import { BsFillLightningChargeFill, BsLink45Deg } from "react-icons/bs";
import { notify } from "../utils/notifications";
import Button from "./Button";
import { ClaimAllRewardsButton } from "./ClaimAllRewardsButton";
import { LockCommunityTokensButton } from "./LockCommunityTokensButton";
import { LockTokensModal, LockTokensModalFormValues } from "./LockTokensModal";
import { PositionCard } from "./PositionCard";
import PreviousRouteBtn from "./PreviousRouteButton";
import { VotingPowerBox } from "./VotingPowerBox";

function daysToSecs(days: number): number {
  return days * 60 * 60 * 24;
}

export const LockTokensAccount: React.FC = (props) => {
  const { createPosition } = useCreatePosition();
  const {
    error: claimingAllRewardsError,
    loading: claimingAllRewards,
    claimAllPositionsRewards,
  } = useClaimAllPositionsRewards();
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const { connected, publicKey } = useWallet();
  const {
    loading: loadingSubDaos,
    error: subDaosError,
    result: subDaos,
  } = useSubDaos();

  const {
    loading,
    positions,
    votingPower,
    amountLocked,
    refetch: refetchState,
    mint,
  } = useHeliumVsrState();

  /// TODO: Change when generic
  const tokenName = "HNT";
  const canDelegate = true;

  const { info: registrar } = useRegistrar(getRegistrarKey(mint));
  const { info: mintAcc } = useMint(mint);
  const { associatedAccount, loading: loadingAta } = useAssociatedTokenAccount(
    publicKey,
    mint
  );

  const sortedPositions = useMemo(
    () =>
      positions?.sort((a, b) => {
        if (a.hasGenesisMultiplier || b.hasGenesisMultiplier) {
          if (b.hasGenesisMultiplier) {
            return a.amountDepositedNative.gt(b.amountDepositedNative) ? 0 : -1;
          }
          return -1;
        }

        return a.amountDepositedNative.gt(b.amountDepositedNative) ? -1 : 0;
      }),
    [positions]
  );

  const positionsWithRewards = useMemo(
    () => positions?.filter((p) => p.hasRewards),
    [positions]
  );

  useEffect(() => {
    if (subDaosError) {
      notify({
        type: "error",
        message: subDaosError.message || "Unable to fetch subdaos",
      });
    }
  }, [subDaosError]);

  const hasTokensInWallet = associatedAccount && associatedAccount.amount > 0;

  const availableTokensDisplay = loadingAta
    ? "Loading..."
    : hasTokensInWallet && mintAcc
    ? humanReadable(
        new BN(associatedAccount.amount.toString()),
        mintAcc.decimals
      )
    : "0";

  const amountLockedDisplay =
    amountLocked && mint ? humanReadable(amountLocked, mintAcc?.decimals) : "0";

  const maxLockupAmount =
    hasTokensInWallet && mintAcc
      ? toNumber(new BN(associatedAccount?.amount.toString()), mintAcc.decimals)
      : 0;

  const handleCalcLockupMultiplier = useCallback(
    (lockupPeriodInDays: number) =>
      calcLockupMultiplier({
        lockupSecs: daysToSecs(lockupPeriodInDays),
        registrar,
        mint,
      }),
    [mint, registrar]
  );

  const handleLockTokens = async (values: LockTokensModalFormValues) => {
    const { amount, lockupPeriodInDays, lockupKind } = values;
    const amountToLock = toBN(amount, mintAcc!.decimals);
    console.log(mint.toBase58());
    await createPosition({
      amount: amountToLock,
      lockupPeriodsInDays: lockupPeriodInDays,
      lockupKind: lockupKind.value,
      mint,
    });
    await refetchState();
  };

  const handleClaimAllRewards = async () => {
    try {
      await claimAllPositionsRewards({ positions: positionsWithRewards });

      if (!claimingAllRewardsError) {
        await refetchState();
      }
    } catch (e) {
      notify({
        type: "error",
        message: e.message || "Unable to claim rewards",
        error: e,
      });
    }
  };

  const mainBoxesClasses = "bg-bkg-1 col-span-1 p-4 rounded-md";
  const isLoading = loading || loadingSubDaos;

  return (
    <div className="grid grid-cols-12 gap-4 text-white">
      <div className="bg-bkg-2 rounded-lg p-4 md:p-6 col-span-12">
        <div className="mb-4">
          <PreviousRouteBtn />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="leading-none flex flex-col mb-0">
            My governance power
          </h1>

          <div className="ml-auto flex flex-row">
            <LockCommunityTokensButton
              mint={mint}
              onClick={() => setIsLockModalOpen(true)}
            />
          </div>
        </div>
        {connected ? (
          <div>
            <div className="grid md:grid-cols-3 grid-flow-row gap-4 pb-8">
              {isLoading ? (
                <>
                  <div className="animate-pulse bg-bkg-3 col-span-1 h-44 rounded-md" />
                  <div className="animate-pulse bg-bkg-3 col-span-1 h-44 rounded-md" />
                  <div className="animate-pulse bg-bkg-3 col-span-1 h-44 rounded-md" />
                </>
              ) : (
                <>
                  <div className="col-span-1">
                    {mint && (
                      <VotingPowerBox
                        className={mainBoxesClasses}
                        mint={mint}
                        votingPower={votingPower}
                        amountLocked={amountLocked}
                      />
                    )}
                  </div>
                  <>
                    <div className={mainBoxesClasses}>
                      <p className="text-fgd-3">{`${tokenName} Available`}</p>
                      <span className="hero-text">
                        {availableTokensDisplay}
                      </span>
                    </div>
                    <div className={mainBoxesClasses}>
                      <p className="text-fgd-3">Locked</p>
                      <span className="hero-text">{amountLockedDisplay}</span>
                    </div>
                  </>
                </>
              )}
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="mb-4">Locked Positions</h2>
              {canDelegate && (
                <ClaimAllRewardsButton
                  onClick={handleClaimAllRewards}
                  isLoading={claimingAllRewards}
                />
              )}
            </div>
            <div
              className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8`}
            >
              {!loading &&
                sortedPositions?.map((pos, idx) => (
                  <PositionCard key={idx} position={pos} subDaos={subDaos} />
                ))}
              <div className="border border-fgd-4 flex flex-col items-center justify-center p-6 rounded-lg">
                <BsFillLightningChargeFill className="h-8 mb-2 text-primary-light w-8" />
                <p className="flex text-center pb-6">
                  Increase your voting power by locking your tokens.
                </p>
                <Button
                  onClick={() => setIsLockModalOpen(true)}
                  disabled={!hasTokensInWallet}
                  {...(hasTokensInWallet
                    ? {}
                    : {
                        tooltipMessage:
                          "You don't have any governance tokens in your wallet to lock.",
                      })}
                >
                  <div className="flex items-center">
                    <AiFillLock className="h-5 mr-1.5 w-5" />
                    <span>Lock Tokens</span>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-fgd-4 flex flex-col items-center justify-center p-6 rounded-lg">
            <BsLink45Deg className="h-6 mb-1 text-primary-light w-6" />
            <span className="text-fgd-1 text-sm">Connect your wallet</span>
          </div>
        )}
        {isLockModalOpen && (
          <LockTokensModal
            mint={mint}
            isOpen={isLockModalOpen}
            maxLockupAmount={maxLockupAmount}
            calcMultiplierFn={handleCalcLockupMultiplier}
            onClose={() => setIsLockModalOpen(false)}
            onSubmit={handleLockTokens}
          />
        )}
      </div>
    </div>
  );
};
