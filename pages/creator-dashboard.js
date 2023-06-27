import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import Web3Modal from 'web3modal'
import axios from 'axios'

import { nftaddress, nftmarketaddress } from '../config'

import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json'

export default function CreatorDashboard() {
  const [nfts, setNfts] = useState([])
  const [sold, setSold] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')

  useEffect(() => {
    loadNFTs()
  }, [])

  async function loadNFTs() {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    const marketContract = new ethers.Contract(nftmarketaddress, Market.abi, signer)
    const tokenContract = new ethers.Contract(nftaddress, NFT.abi, provider)
    const data = await marketContract.fetchItemsCreated()

    const items = await Promise.all(data.map(async (i) => {
      const tokenUri = await tokenContract.tokenURI(i.tokenId)
      const meta = await axios.get(tokenUri)
      const price = ethers.utils.formatUnits(i.price.toString(), 'ether')
      const item = {
        tokenId: i.tokenId.toNumber(),
        owner: i.owner,
        price: price,
        image: meta.data.image,
        name: meta.data.name,
        description: meta.data.description,
      }
      return item
    }))

    const soldItems = items.filter((i) => i.sold)
    setSold(soldItems)
    setNfts(items)
    setLoadingState('loaded')
  }

  return (
    <div>
      <div className='p-4'>
        <h2 className='text-2xl py-2'>Items Created</h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4'>
          {nfts.map((nft, i) => (
            <div key={i} className='border shadow rounded-xl overflow-hidden'>
              <img src={nft.image} className='rounded' />
              <div className='p-4 bg-black'>
                <p className='text-2xl font-bold text-white'>Price - {nft.price} FTM</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className='px-4'>
        {Boolean(sold.length) && (
          <div>
            <h2 className='text 2xl py-2'>Items Sold</h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4'>
              {sold.map((nft, i) => (
                <div key={i} className='border shadow rounded-xl overflow-hidden'>
                  <img src={nft.image} className='rounded' />
                  <div className='p-4 bg-black'>
                    <p className='text-2xl font-bold text-white'>Price - {nft.price} FTM</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
