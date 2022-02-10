/***
NFT Drop Test Smart Contract
***/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFTDrop is ERC721Enumerable, Ownable {
    using MerkleProof for bytes32[];

    mapping(address => bool) public alreadyMinted;

    uint16 private reserveNFTsId;
    uint16 private NFTsId;

    bytes32 public merkleRoot;
    bool public merkleEnabled = true;

    string private baseURI;

    bool public saleStarted = true;
    uint256 public constant maxMint = 2222;

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    constructor() ERC721("NFT Drop", "NFTDrop") {
        baseURI = "";
        reserveNFTsId = 1; // item 1-50
        NFTsId = 51; // item 51-2222
    }

    function setBaseURI(string memory _baseUri) public onlyOwner {
        baseURI = _baseUri;
    }

    function mint(bytes32[] memory proof, bytes32 leaf) public returns (uint256) {
        // merkle tree
        if (merkleEnabled) {
            require(keccak256(abi.encodePacked(msg.sender)) == leaf, "This leaf does not belong to the sender");
            require(proof.verify(merkleRoot, leaf), "You are not in the list");
        }

        require(saleStarted == true, "The sale is paused");
        require(msg.sender != address(0x0), "Public address is not correct");
        require(alreadyMinted[msg.sender] == false, "Address already used");
        require(NFTsId <= maxMint, "Mint limit reached");

        _safeMint(msg.sender, NFTsId++);

        alreadyMinted[msg.sender] = true;

        return NFTsId;
    }

    function reserveNFTs(address to, uint8 amount) public onlyOwner {
        require(reserveNFTsId + amount <= 51, "Out of stock");

        for (uint8 i = 0; i < amount; i++) _safeMint(to, reserveNFTsId++);
    }

    function startSale() public onlyOwner {
        saleStarted = true;
    }

    function pauseSale() public onlyOwner {
        saleStarted = false;
    }

    function setMerkleRoot(bytes32 _root) public onlyOwner {
        merkleRoot = _root;
    }

    function startMerkle() public onlyOwner {
        merkleEnabled = true;
    }

    function stopMerkle() public onlyOwner {
        merkleEnabled = false;
    }
}
