import React, { useState } from 'react';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import { useRouter } from 'next/router';
import Web3Modal from 'web3modal';
import { Buffer } from 'buffer';

import { nftaddress, nftmarketaddress } from '../config';
import NFT from '../artifacts/contracts/NFT.sol/NFT.json';
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json';

const projectId = '2QSLKeVslaS2Cuybc6kcYmkK3Rp';
const projectSecret = '89dfae524897185de7829f8fb368bf19';
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const client = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  apiPath: '/api/v0',
  headers: {
    authorization: auth,
  },
});

export default function CreateItem() {
  const [fileUrl, updateFileUrl] = useState(null);
  const [formInput, setFormInput] = useState({ price: '', name: '', description: '' });
  const router = useRouter();

  const handleInputChange = (e) => {
    setFormInput({ ...formInput, [e.target.name]: e.target.value });
  };

  const onChange = async (e) => {
    const file = e.target.files[0];
    try {
      const added = await client.add(file, {
        progress: (prog) => console.log(`received: ${prog}`),
      });
      const v1CID = added.cid.toV1();
      const url = `https://cloudflare-ipfs.com/ipfs/${v1CID}`;
      updateFileUrl(url);
    } catch (error) {
      console.log('Error uploading file:', error);
    }
  };

  const createItem = async () => {
    const { name, description, price } = formInput;
    if (!name || !description || !price || !fileUrl) return;

    const data = JSON.stringify({
      name,
      description,
      image: fileUrl,
    });

    try {
      const added = await client.add(data);
      const v1CID = added.cid.toV1();
      const url = `https://cloudflare-ipfs.com/ipfs/${v1CID}`;
      createSale(url);
    } catch (error) {
      console.log('Error uploading file: ', error);
    }
  };

  const createSale = async (url) => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    let contract = new ethers.Contract(nftaddress, NFT.abi, signer);
    let transaction = await contract.createToken(url);
    let tx = await transaction.wait();

    let event = tx.events[0];
    let value = event.args[2];
    let tokenId = value.toNumber();

    const price = ethers.utils.parseUnits(formInput.price, 'ether');

    contract = new ethers.Contract(nftmarketaddress, Market.abi, signer);
    let listingPrice = await contract.getListingPrice();
    listingPrice = listingPrice.toString();

    transaction = await contract.createMarketItem(nftaddress, tokenId, price, { value: listingPrice });
    await transaction.wait();
    router.push('/');
  };

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          id="assetName"
          name="name"
          placeholder="Asset Name"
          className="mt-8 border rounded p-4"
          onChange={handleInputChange}
        />
        <textarea
          id="assetDescription"
          name="description"
          placeholder="Asset Description"
          className="mt-2 border rounded p-4"
          onChange={handleInputChange}
        />
        <input
          id="assetPrice"
          name="price"
          placeholder="Asset Price in AZETA"
          className="mt-2 border rounded p-4"
          onChange={handleInputChange}
        />
        <input type="file" name="Asset" className="my-4" onChange={onChange} />
        {fileUrl && <img className="rounded mt-4" width="350" src={fileUrl} alt="Preview" />}
        <button
          onClick={createItem}
          className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg"
        >
          Create Digital Asset
        </button>
      </div>
    </div>
  );
}
