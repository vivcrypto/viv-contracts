| 合约                     | 错误编码    | 中文错误描述                | 英文错误描述                                                                                     |
|------------------------|---------|-----------------------|--------------------------------------------------------------------------------------------|
| COMMON                 | VIV0001 | 交易金额必须大于0。            | The value must greater than 0.                                                             |
| COMMON                 | VIV0002 | 转入的金额必须等于参数中传入的金额。    | The send value must equals to the value in the args.                                       |
| COMMON                 | VIV0003 | 余额必须大于等于交易金额。         | The balance must equals or great than the value.                                           |
| COMMON                 | VIV0004 | 授权金额必须大于等于交易金额。       | The allowance must equals or great than the value.                                         |
| COMMON                 | VIV0005 | 调用的人必须是owner。         | The sender must be owner.                                                                  |
| COMMON                 | VIV0006 | 优惠券不能被重复使用。           | Coupon cannot be reused.                                                                   |
| COMMON                 | VIV0007 | 优惠券验签失败。              | Coupon verification failed.                                                                |
| COMMON                 | VIV0008 | 加法运算有误。               | Error in addition.                                                                         |
| COMMON                 | VIV0009 | 减法运算有误。               | Error in subtraction.                                                                      |
| COMMON                 | VIV0010 | 乘法运算有误。               | Error in multiplication.                                                                   |
| COMMON                 | VIV0011 | 除法运算有误。               | Error in division.                                                                         |
| viv-guarantee          | VIV0021 | 发起人必须是买家。             | The sender must be buyer.                                                                  |
| viv-guarantee          | VIV0022 | 发起人必须是卖家。             | The sender must be seller.                                                                 |
| viv-guarantee          | VIV0023 | 发起人必须是平台。             | The sender must be platform.                                                               |
| viv-guarantee          | VIV0024 | 状态有误。                 | The state is error.                                                                        |
| viv-guarantee          | VIV0025 | 卖家提现时验证签名失败。          | Check signed failed.                                                                       |
| viv-guarantee          | VIV0026 | 卖家提现时余额不足。            | Insufficient balance.                                                                      |
| viv-guarantee          | VIV0027 | 买家提现时验证签名失败。          | Check signed failed.                                                                       |
| viv-guarantee          | VIV0028 | 买家提现时余额不足。            | Insufficient balance.                                                                      |
| viv-multi-transfer     | VIV0029 | 批量转账地址与金额个数必须一致。      | The size of addresses must equals the size of values.                                      |
| viv-multi-transfer     | VIV1201 | 批量转账地址个数必须大于0。        | The size of addresses must greater than zero.                                              |
| viv-security-transfer  | VIV0030 | from地址不能为空。           | From address is error.                                                                     |
| viv-security-transfer  | VIV1301 | To地址不能为空。             | To address is error.                                                                       |
| viv-multi-sign         | VIV0031 | 不能是owner。             | It can't be owner.                                                                         |
| viv-multi-sign         | VIV0032 | 确认人数不能超过成员个数。         | The number of owners is less than the threshold.                                           |
| viv-multi-sign         | VIV0033 | 确认人数必须小于等于成员个数，且最小确认人数不能小于2个。       | The threshold must greater than 2 and less than the length of the owners.                  |
| viv-multi-sign         | VIV0034 | 成员不能为空。               | The owner can't be null.                                                                   |
| viv-multi-sign         | VIV0035 | 成员不能重复。               | The owner can't be duplicated.                                                             |
| viv-multi-sign         | VIV0036 | 本币余额不足。               | Insufficient balance.                                                                      |
| viv-multi-sign         | VIV0037 | 代币余额不足。               | Insufficient balance.                                                                      |
| viv-multi-sign         | VIV1401 | 接收人地址不能为控。            | The recipient address cannot be controlled.                                                |
| viv-multi-sign         | VIV1402 | 重复确认。                 | Repeate confrim.                                                                           |
| viv-multi-sign         | VIV1403 | 未确认不能撤销。              | Unconfirmed cannot be revoked.                                                             |
| viv-multi-sign         | VIV1404 | 最大成员人数不能超过10人。        | Maximum number of members cannot exceed 10.                                                |
| viv-multi-sign         | VIV1405 | 地址不能为空。               | address can not be zero address.                                                           |
| viv-multi-sign         | VIV1406 | 交易不存在。               | The trade is not exists.                                                           |
| viv-multi-sign         | VIV1407 | 未确认过当前交易。               | Do not confirm this transaction.                                                           |
| viv-multi-sign         | VIV1408 | 当前交易已经执行过。               | The transaction has been done.                                                           |
| viv-trade-normal       | VIV5001 | 卖家不能为空。               | The seller can't be null.                                                                  |
| viv-trade-normal       | VIV5002 | 平台不能为空。               | The platform can't be null.                                                                |
| viv-trade-normal       | VIV5003 | 担保人不能为空。              | The guarantor can't be null.                                                               |
| viv-trade-normal       | VIV5004 | 交易已经存在。               | The trade has exists.                                                                      |
| viv-trade-normal       | VIV5005 | 交易不存在。                | The trade is not exists.                                                                   |
| viv-trade-normal       | VIV5006 | 提现时验证签名失败。            | Check signed failed.                                                                       |
| viv-trade-normal       | VIV5007 | 提现时余额不足。              | Insufficient balance.                                                                      |
| viv-trade-normal       | VIV5008 | 仲裁费用必须大于等于0。          | Arbitration fee must be greater than or equal to 0.                                        |
| viv-trade-normal       | VIV5009 | 平台手续费用必须大于等于0。        | The platform fee must be greater than or equal to 0.                                       |
| viv-trade-normal       | VIV5010 | 可提现金额不足。              | Insufficient withdrawal amount.                                                            |
| viv-trade-normal       | VIV5011 | 发起人必须是买家或者卖家。         | The sender must be a buyer or seller.                                                      |
| viv-trade-normal       | VIV5012 | 提现总金额不等于交易金额。         | The total withdrawal amount is not equal to the transaction amount.                        |
| viv-auction            | VIV0045 | 担保人不能为空。              | param:address is null.                                                                     |
| viv-auction            | VIV0046 | 拍卖结束时间必须大于当前时间。       | param:endTime must be greater than current time(sec).                                      |
| viv-auction            | VIV0047 | 每次出价必须大于0。            | param: range must be greater zero.                                                         |
| viv-auction            | VIV0048 | 拍卖已经结束。               | The auction is over.                                                                       |
| viv-auction            | VIV0049 | 竞拍金额必须是出价金额的倍数。       | error price; bids must be multiples of range.                                              |
| viv-auction            | VIV0050 | 竞拍金额必须高于起始金额。         | error price; Bids must be above the reserve price.                                         |
| viv-auction            | VIV0051 | 竞拍金额必须高于当前最高出价。       | The bid must be higher than the top price.                                                 |
| viv-auction            | VIV0052 | 未到拍卖结束时间。             | The auction is not over.                                                                   |
| viv-auction            | VIV0053 | 最高出价者不允许退出竞拍。         | Can't refund for winner, use the Withdraw function.                                        |
| viv-auction            | VIV0054 | 没有竞拍或者已经退出竞拍。         | There is not enough deposit at this address.                                               |
| viv-auction            | VIV0055 | 提现需发起人或者最高出价人。        | The function must be called by the publisher or winner.                                    |
| viv-auction            | VIV0056 | 提现需要担保人或者最高出价人。       | The sign must be one of winner or guarantee.                                               |
| viv-auction            | VIV0057 | 提现需发起人或者担保人。          | The sign must be one of publisher or guarantee.                                            |
| viv-trade-dao          | VIV0058 | 交易金额不能大于已筹总额。         | The trade amount can't be greater than the target amount.                                  |
| viv-trade-dao          | VIV0059 | 传入的dao token地址不正确。    | The dao token address is invalid.                                                          |
| viv-trade-dao          | VIV0060 | 重复交易。                 | The trade has exists.                                                                      |
| viv-trade-dao          | VIV0061 | 募集的余额不足。              | Insufficient balance.                                                                      |
| viv-trade-dao          | VIV0062 | Dao token的余额不足。       | Insufficient balance.                                                                      |
| viv-trade-dao          | VIV5201 | 募集金额必须大于0。            | The amount raised must be greater than 0.                                                  |
| viv-trade-dao          | VIV5202 | DAO token的地址不能为空。     | The dao token address can't be zero.                                                       |
| viv-trade-dao          | VIV5203 | 提现募集金额和提现DAO金额不能同时为0。 | Withdrawing the raised amount and withdrawing the DAO amount cannot be 0 at the same time. |
| viv-trade-installment  | VIV5401 | 退款必须由买家发起。            | Refunds must be initiated by the buyer.                                                    |
| viv-trade-installment  | VIV5402 | 交易退款状态不合法。            | Transaction refund status is invalid.                                                      |
| viv-trade-installment  | VIV5403 | 仲裁费用必须大于等于0。          | Arbitration fee must be greater than or equal to 0.                                        |
| viv-trade-installment  | VIV5404 | 平台手续费用必须大于等于0。        | The platform fee must be greater than or equal to 0.                                       |
| viv-trade-installment  | VIV5405 | 可提现金额不足。              | Insufficient withdrawal amount.                                                            |
| viv-trade-installment  | VIV5406 | 发起人必须是买家或者卖家。         | The sender must be a buyer or seller.                                                      |
| viv-trade-installment  | VIV5407 | 非退款状态，买家不能提现。         | Non-refundable status, buyers cannot withdraw cash.                                        |
| viv-trade-installment  | VIV5408 | 金额列表时间列表数量必须一致。       | The size of values must be equal to the size of times.                                     |
| viv-trade-installment  | VIV5409 | 金额列表时间列表数量必须大于0。      | The size of values and the size of times must be greater than 0.                           |
| viv-trade-installment  | VIV5410 | 买家申请退款，不能再提现。         | The buyer applies for a refund and cannot withdraw any more.                               |
| viv-trade-timer        | VIV5501 | 买家需补齐的保证金金额不足。        | Insufficient amount of security deposit required by the buyer.                             |
| viv-trade-timer        | VIV5502 | 买家没有足够的金额支付欠款。        | Buyer does not have enough money to pay the debt.                                          |
| viv-trade-timer        | VIV5503 | 支付金额与待付金额不匹配。         | The payment amount does not match the amount to be paid.                                   |
| viv-trade-timer        | VIV5504 | 买家没有逾期，不能提现保证金。       | The buyer is not overdue and cannot withdraw the deposit.                                  |
| viv-trade-timer        | VIV5505 | 本次交易已经结束。             | This transaction has ended.                                                                |
| viv-trade-timer        | VIV5506 | 没有保证金可退。              | No refundable deposit.                                                                     |
| viv-trade-timer        | VIV5507 | 交易未结束，不能退保证金。         | The transaction is not over and the deposit cannot be refunded.                            |
| viv-trade-lend         | VIV5601 | 只有发布状态才能出借。           | Lending only available in published status.                                                |
| viv-trade-lend         | VIV5602 | 出借金额必须等于借款金额。         | The loan amount must be equal to the loan amount.                                          |
| viv-trade-lend         | VIV5603 | 只有借款状态才能还款。           | Repayment only possible in borrowed status.                                                |
| viv-trade-lend         | VIV5604 | 还款金额必须大于等于借款金额。       | The repayment amount must be greater than or equal to the loan amount.                     |
| viv-trade-lend         | VIV5605 | 提取NFT只能是借款人或者出借人。     | Withdrawing NFTs can only be done by borrowers or lenders.                                 |
| viv-trade-lend         | VIV5606 | 借款人只有发布状态才能提取NFT。     | Borrowers can only withdraw NFTs in the published state.                                   |
| viv-trade-lend         | VIV5607 | 出借人只有借款状态才能提取NFT。     | Lenders can only withdraw NFTs if they are in a lendding state.                            |
| viv-trade-lend         | VIV5608 | 出借人只有在逾期之后才能提取NFT。    | Lenders can only withdraw NFTs after overdue.                                              |
| viv-trade-lend         | VIV5609 | 出借人需支付足够手续费才能提取NFT。   | Lenders need to pay enough fees to withdraw NFTs.                                          |
| viv-trade-lend         | VIV5610 | NFT地址不能为空。            | NFT address cannot be empty.                                                               |
| viv-trade-lend         | VIV5611 | NFT的TOKENID必须大于0。     | NFT's TOKENID must be greater than 0.                                                      |
| viv-trade-lend         | VIV5612 | 借款金额必须大于0。            | The loan amount must be greater than 0.                                                    |
| viv-trade-lend         | VIV5613 | 出借金额必须大于0。            | The lend amount must be greater than 0.                                                    |
| viv-trade-crowdfunding | VIV5701 | 提现只能是项目发起人。           | Withdrawals can only be made by the project sponsor.                                       |
| viv-trade-crowdfunding | VIV5702 | 参数初始化后不能再修改。          | Parameters cannot be modified after initialization.                                        |
| viv-trade-crowdfunding | VIV5703 | 发起人地址不能为控。            | The owner address cannot be empty.                                                         |
| viv-trade-crowdfunding | VIV5704 | 平台地址不能为控。             | The platform address cannot be empty.                                                      |
| viv-trade-trust        | VIV5801 | 委托人地址不能为空。            | Parameters cannot be modified after initialization.                                        |
| viv-trade-trust        | VIV5802 | 只能委托人或者受益人提现。         | Parameters cannot be modified after initialization.                                        |
| viv-trade-trust        | VIV5803 | 未到解锁时间，不能提现。          | Parameters cannot be modified after initialization.                                        |
| viv-trade-trust        | VIV5804 | 只有委托人才能设置。            | Parameters cannot be modified after initialization.                                        |
| viv-trade-trust        | VIV5805 | 新设置的日期不能小于原先的日期。      | Parameters cannot be modified after initialization.                                        |








