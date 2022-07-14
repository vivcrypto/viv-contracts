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
| COMMON                 | VIV0021 | 发起人必须是买家。             | The sender must be buyer.                                                                  |
| COMMON                 | VIV0022 | 发起人必须是卖家。             | The sender must be seller.                                                                 |
| COMMON                 | VIV0023 | 发起人必须是平台。             | The sender must be platform.                                                               |
| COMMON                 | VIV0024 | 状态有误。                 | The state is error.                                                                        |
| COMMON                 | VIV0025 | 卖家提现时验证签名失败。          | Check signed failed.                                                                       |
| COMMON                 | VIV0026 | 卖家提现时余额不足。            | Insufficient balance.                                                                      |
| COMMON                 | VIV0027 | 买家提现时验证签名失败。          | Check signed failed.                                                                       |
| COMMON                 | VIV0028 | 买家提现时余额不足。            | Insufficient balance.                                                                      |
| viv-multi-sign         | VIV0031 | 不能是owner。             | It can't be owner.                                                                         |
| viv-multi-sign         | VIV0032 | 确认人数不能超过成员个数。         | The number of owners is less than the threshold.                                           |
| viv-multi-sign         | VIV0033 | 确认人数必须小于等于成员个数。       | The threshold must greater than 0 and less than the length of the owners.                  |
| viv-multi-sign         | VIV0034 | 成员不能为空。               | The owner can't be null.                                                                   |
| viv-multi-sign         | VIV0035 | 成员不能重复。               | The owner can't be duplicated.                                                             |
| viv-multi-sign         | VIV0036 | 本币余额不足。               | Insufficient balance.                                                                      |
| viv-multi-sign         | VIV0037 | 代币余额不足。               | Insufficient balance.                                                                      |
| viv-multi-sign         | VIV1401 | 接收人地址不能为控。            | The recipient address cannot be controlled.                                                |
| viv-multi-sign         | VIV1402 | 重复确认。                 | Repeate confrim.                                                                           |
| viv-multi-sign         | VIV1403 | 未确认不能撤销。              | Unconfirmed cannot be revoked.                                                             |
| viv-multi-sign         | VIV1404 | 最大成员人数不能超过10人。        | Maximum number of members cannot exceed 10.                                                |
| viv-multi-sign         | VIV1405 | 地址不能为空。               | address can not be zero address.                                                           |
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





