// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * The multi-signature contract is used for multiple people to manage a fund, and the transfer can only be completed after the voted of the designated number of people.
 * At the same time, multi-signature contracts can change the number of voted members and voted members, and these operations also require voted by a designated number of people.
 */
interface MultiSign {
    // FUNCTIONS
    function isOwner(address addr) external view returns (bool);
    function getOwners() external view returns (address[] memory);

    function submitProposal(address to, bytes memory data) external returns (uint);
    function vote(uint proposalId) external;
    function executeProposal(uint proposalId) external;
    function isVoted(uint proposalId) external view returns (bool);
    function isDelay(uint proposalId) external view returns (bool);
    function getVoted(uint256 proposalId) external view returns (uint256, address[] memory);

    function transfer(address to, uint256 value, address token) external;

    function changeOwner(address oldOwenr, address newOwner) external;
    function addOwner(address owner,  uint256 threshold) external;
    function removeOwner(address owner, uint256 threshold) external;
    function changeRequirement(uint256 threshold) external;

    function updateDelay(uint256 newDelay) external;
}

/**
 * multi-signn, daily-limited account proxy/wallet.
 */
abstract contract MultiOwned is MultiSign {

    using SafeERC20 for IERC20;
    using Address for address payable;

    // the number of owners that must vote the same operation before it is run.
    uint256 _threshold;

    // list of owners
    address[] _owners;
    // max owners allow to set

    uint256 public constant MAX_OWNER_COUNT = 10;
    // index on the list of owners to allow reverse lookup
    mapping(address => bool) _ownerIndex;
    // time lock
    uint256 _delay = 48;

    // some others are in the case of an owner changing.
    event OwnerChanged(address oldOwner, address newOwner);
    event OwnerAdded(address newOwner);
    event OwnerRemoved(address oldOwner);
    // the last one is emitted if the threshold signatures change
    event RequirementChanged(uint256 newRequirement);
    event DelayChange(uint256 delay, uint256 newDelay);
    event Transfer(address indexed from, address indexed to, uint256 value);

    // MODIFIERS
    modifier onlyWallet() {
        require(msg.sender == address(this));
        _;
    }

    modifier ownerExists(address addr) {
        require(_ownerIndex[addr], "VIV0005");
        _;
    }

    modifier ownerDoesNotExist(address addr) {
        require(!_ownerIndex[addr], "VIV0031");
        _;
    }

    modifier minThreshold(uint256 threshold, uint256 numOwners) {
        require(threshold >= 2 && threshold <= numOwners, "VIV0032");
        _;
    }

    modifier maxMembers(uint256 maxOwners, uint256 numOwners) {
        require(numOwners <= maxOwners, "VIV1404");
        _;
    }

    modifier validAddress(address owner) {
        require(owner != address(0), "VIV1405");
        _;
    }

    /// @dev The constructor specifies the members of the multi-signature wallet, the number of voteds, and the time lock
    /// @param owners List of initial owners.
    /// @param threshold Number of required voteds.
    /// @param delay Time lock.
    constructor(address[] memory owners, uint256 threshold, uint256 delay) {
        require(threshold <= owners.length && threshold >= 2, "VIV0033");
        for (uint256 i = 0; i < owners.length; ++i) {
            require(owners[i] != address(0), "VIV0034");
            require(!_ownerIndex[owners[i]], "VIV0035");
            _ownerIndex[owners[i]] = true;
        }
        _owners = owners;
        _threshold = threshold;
        _delay = delay;
    }

    /// @dev Returns all owners
    /// @return Returns List of owners.
    function getOwners() external view override returns (address[] memory) {
        return _owners;
    }

    /// @dev Returns whether is a owner
    /// @param owner Owner address.
    /// @return Returns status of owner.
    function isOwner(address owner) external view override returns (bool) {
        return _ownerIndex[owner];
    }

    /// @dev Replace an owner `from` with another `to`.
    /// @param from Old owner address.
    /// @param to New owner address.
    function changeOwner(
        address from,
        address to
    )   external 
        override 
        validAddress(from) 
        validAddress(to) 
        onlyWallet 
        ownerExists(from) 
        ownerDoesNotExist(to) {
        for (uint i=0; i< _owners.length; i++)
            if (_owners[i] == from) {
                _owners[i] = to;
                break;
            }
        _ownerIndex[from] = false;
        _ownerIndex[to] = true;
        emit OwnerChanged(from, to);
    }

    /// @dev Add an owner
    /// @param owner New owner address.
    /// @param newthreshold New number of required voteds.
    function addOwner(
        address owner,
        uint256 newthreshold
    )
        external
        override
        validAddress(owner)
        onlyWallet
        ownerDoesNotExist(owner)
        minThreshold(newthreshold, _owners.length + 1)
        maxMembers(MAX_OWNER_COUNT, _owners.length + 1)
    {
        _ownerIndex[owner] = true;
        _owners.push(owner);
        emit OwnerAdded(owner);

        _changeThreshold(newthreshold);
    }

    /// @dev Remove an owner
    /// @param owner Owner address.
    /// @param newthreshold New number of required voteds.
    function removeOwner(
        address owner,
        uint256 newthreshold
    )
        external
        override
        validAddress(owner)
        onlyWallet
        minThreshold(newthreshold, _owners.length - 1)
        ownerExists(owner)
    {
        _ownerIndex[owner] = false;
        for (uint i=0; i< _owners.length - 1; i++)
            if (_owners[i] == owner) {
                _owners[i] = _owners[_owners.length - 1];
                break;
            }
        _owners.pop();
        emit OwnerRemoved(owner);

        _changeThreshold(newthreshold);
    }

    /// @dev Change requirement
    /// @param newthreshold New number of required voteds.
    function changeRequirement(uint256 newthreshold)
        external
        override
        onlyWallet
        minThreshold(newthreshold, _owners.length)
    {
        _changeThreshold(newthreshold);
    }

    /// @dev Transfer
    /// @param to Target address.
    /// @param value Proposal value.
    /// @param token Zero address means ether, otherwise means erc20 token.
    function transfer(
        address to,
        uint256 value,
        address token
    )   external 
        override 
        onlyWallet 
    {
        require(to != address(0), "VIV1401");
        require(value > 0, "VIV0001");

        if (token == address(0)) {
            require(address(this).balance >= value, "VIV0036");
        } else {
            require(IERC20(token).balanceOf(address(this)) >= value, "VIV0037");
        }
        if (token == address(0)) {
            payable(to).sendValue(value);
            emit Transfer(address(this), to, value);
        } else {
            IERC20(token).safeTransfer(to, value);
        }
    }

    /// @dev Update delay
    /// @param newDelay New delay.
    function updateDelay(uint256 newDelay) 
        external 
        override 
        onlyWallet
    {
        emit DelayChange(_delay, newDelay);
        _delay = newDelay;
    }

    function _changeThreshold(uint256 newthreshold) internal {
        if (newthreshold == _threshold) return;
        _threshold = newthreshold;
        emit RequirementChanged(newthreshold);
    }
}

/**
 * Viv multi sign
 */
contract VivMultiSign is MultiSign, MultiOwned, ReentrancyGuard {

    // Proposal structure to remember details of proposal lest it need be saved for a later call.
    struct Proposal {
        address to;
        bytes data;
        bool done;
        uint256 createDate;
        uint256 votedTimes;
    }

    // pending proposals we have at present.
    mapping(uint256 => Proposal) public txs;
    uint public txsCount;
    mapping (uint => mapping (address => bool)) public voteds;

    event Voted(address indexed sender, uint indexed proposalId);
    event Revocation(address indexed sender, uint indexed proposalId);
    event Submission(uint indexed proposalId);
    event Execution(uint indexed proposalId);
    event ExecutionFailure(uint indexed proposalId);

    modifier proposalExists(uint proposalId) {
        require(txs[proposalId].to != address(0), 'VIV1406');
        _;
    }

    modifier voted(uint proposalId, address owner) {
        require(voteds[proposalId][owner], 'VIV1407');
        _;
    }

    modifier notVoted(uint proposalId, address owner) {
        require(!voteds[proposalId][owner], 'VIV1402');
        _;
    }

    modifier notDone(uint proposalId) {
        require(!txs[proposalId].done, 'VIV1408');
        _;
    }

    // constructor - just pass on the owner array to the multiowned and
    // the limit to daylimit
    constructor(
        address[] memory owners,
        uint256 threshold,
        uint delay
    ) MultiOwned(owners, threshold, delay) {}

    receive() external payable {}

    /// @dev Allows an owner to submit and vote a proposal.
    /// @param to Proposal target address.
    /// @param data Proposal data payload.
    /// @return proposalId proposal ID.
    function submitProposal(address to, bytes memory data)
        external override
        ownerExists(msg.sender)
        nonReentrant()
        returns (uint proposalId)
    {
        proposalId = _addProposal(to, data);
        _vote(proposalId);
    }

    /// @dev Allows an owner to voted a proposal.
    /// @param proposalId Proposal ID.
    function vote(uint proposalId)
        external override
        ownerExists(msg.sender)
        proposalExists(proposalId)
        notVoted(proposalId, msg.sender)
        nonReentrant()
    {
        _vote(proposalId);
    }

    /// @dev Allows anyone to execute a voted proposal.
    /// @param proposalId Proposal ID.
    function executeProposal(uint proposalId)
        external override
        ownerExists(msg.sender)
        voted(proposalId, msg.sender)
        notDone(proposalId)
        nonReentrant()
    {
        _executeProposal(proposalId);
    }

    /// @dev Returns the voted status of a proposal.
    /// @param proposalId Proposal ID.
    /// @return Voted status.
    function isVoted(uint proposalId)
        external view override
        returns (bool)
    {
        return _isVoted(proposalId);
    }

    /// @dev Returns the delay status of a proposal.
    /// @param proposalId Proposal ID.
    /// @return Delay status.
    function isDelay(uint proposalId) 
        external view override
        returns (bool)
    {
        return _isDelay(proposalId);
    }

    /// @dev Returns number and array with owner addresses, which voted proposal.
    /// @param proposalId Proposal ID.
    /// @return Returns array of owner addresses.
    function getVoted(uint256 proposalId) 
        external view override
        returns (uint256, address[] memory) 
    {
        address[] memory votedOwners = new address[](_owners.length);
        uint256 count = 0;
        for (uint256 i = 0; i< _owners.length; i++) {
            if (voteds[proposalId][_owners[i]]) {
                votedOwners[count] = _owners[i];
                count ++;
            }
        }
        return (count, votedOwners);
    }

    /*
     * Internal functions
     */
    /// @dev Adds a new proposal to the proposal mapping, if proposal does not exist yet.
    /// @param to Proposal target address.
    /// @param data Proposal data payload.
    /// @return proposalId proposal ID.
    function _addProposal(address to, bytes memory data)
        internal
        validAddress(to)
        returns (uint proposalId)
    {
        proposalId = txsCount;
        txs[proposalId] = Proposal({
            to: to,
            data: data,
            done: false,
            createDate: block.timestamp,
            votedTimes: 0
        });
        txsCount += 1;
        emit Submission(proposalId);
    }

    /// @dev Allows an owner to vote a proposal.
    /// @param proposalId Proposal ID.
    function _vote(uint proposalId)
        internal
    {
        voteds[proposalId][msg.sender] = true;
        Proposal storage txn = txs[proposalId];
        txn.votedTimes ++;
        emit Voted(msg.sender, proposalId);
        _executeProposal(proposalId);
    }

    /// @dev Allows anyone to execute a voted proposal.
    /// @param proposalId Proposal ID.
    function _executeProposal(uint proposalId)
        internal {
        if (_isVoted(proposalId)) {
            Proposal storage txn = txs[proposalId];
            // time lock
            if(!_isDelay(proposalId)) {
                return;
            }
            txn.done = true;
            (bool success, ) = txn.to.call(txn.data);
            if (success)
                emit Execution(proposalId);
            else {
                emit ExecutionFailure(proposalId);
                txn.done = false;
            }
        }
    }

    /// @dev Returns the voted status of a proposal.
    /// @param proposalId Proposal ID.
    /// @return Voted status.
    function _isVoted(uint proposalId)
        internal view
        returns (bool)
    {
        Proposal memory txn = txs[proposalId];
        return txn.votedTimes >= _threshold;
    }

    /// @dev Returns the delay status of a proposal.
    //       Voted = txn.votedTimes / _owners.length
    //       Voted  Delay(1h)  Delay(2h)  Delay(8h)  
    //       100%   0h         0h         0h
    //       95%    1h         2h         8h
    //       90%    2h         4h         16h
    //       80%    4h         8h         32h
    //       70%    6h         12h        48h
    /// @param proposalId Proposal ID.
    /// @return Delay status.
    function _isDelay(uint proposalId) 
        internal view
        returns (bool)
    {
        Proposal memory txn = txs[proposalId];
        uint factor = 20 - (20 * txn.votedTimes) / _owners.length;
        return block.timestamp >= txn.createDate + (uint256)(factor * _delay * 1 hours);
    }
}
